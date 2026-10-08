import { db } from "@/lib/db";
import { canJoinAtSession, deductsCredit } from "@/lib/rules";
import { conflictLabel, sessionDates, sessionStatus } from "@/lib/schedule";
import { localDayKey, uid, weekdayShort } from "@/lib/utils";
import type { AttendStatus, LeadStage, Level, PayMethod, Role, TaskPriority, TaskStatus } from "@/types";

export async function moveLead(id: string, stage: LeadStage) {
  const lead = await db.leads.get(id);
  if (!lead || lead.stage === stage) return;
  const labels: Record<LeadStage, string> = {
    new: "Mới",
    contacted: "Đã liên hệ",
    trial: "Học thử",
    won: "Chốt",
    lost: "Thất bại",
  };
  await db.leads.update(id, {
    stage,
    activities: [
      ...lead.activities,
      { day: localDayKey(), text: `Chuyển sang ${labels[stage]}.` },
    ],
  });
}

export async function addLead(input: {
  name: string;
  phone: string;
  interest: string;
  source: string;
  ownerId: string;
}) {
  const day = localDayKey();
  await db.leads.add({
    id: uid("ld"),
    name: input.name.trim(),
    phone: input.phone.trim(),
    source: input.source,
    stage: "new",
    interest: input.interest.trim(),
    ownerId: input.ownerId,
    day,
    note: "",
    activities: [{ day, text: "Tạo lead tại quầy.", kind: "note" }],
  });
}

export async function addLeadTouch(id: string, kind: "call" | "zalo" | "note", text: string) {
  const lead = await db.leads.get(id);
  const body = text.trim();
  if (!lead || !body) return;
  const label = kind === "call" ? "Gọi" : kind === "zalo" ? "Zalo" : "Ghi chú";
  await db.leads.update(id, {
    activities: [...lead.activities, { day: localDayKey(), text: `${label}: ${body}`, kind }],
  });
}

export async function setLeadReminder(id: string, nextAction: string, reminderDay: string) {
  const lead = await db.leads.get(id);
  if (!lead) return;
  const action = nextAction.trim();
  await db.leads.update(id, {
    nextAction: action,
    reminderDay,
    activities: [...lead.activities, { day: localDayKey(), text: `Việc tiếp: ${action || "—"}${reminderDay ? ` · nhắc ${reminderDay}` : ""}`, kind: "note" }],
  });
}

export async function assignLeads(ids: string[], ownerId: string) {
  const owner = await db.users.get(ownerId);
  const day = localDayKey();
  await db.transaction("rw", db.leads, async () => {
    for (const id of ids) {
      const lead = await db.leads.get(id);
      if (!lead) continue;
      await db.leads.update(id, {
        ownerId,
        activities: [...lead.activities, { day, text: `Gán cho ${owner?.name ?? "người phụ trách"}.`, kind: "note" }],
      });
    }
  });
}

export async function convertLead(id: string, branchId: string) {
  const lead = await db.leads.get(id);
  if (!lead) return "Không thấy lead.";
  if (lead.stage !== "won") return "Chỉ chuyển khi lead đã ở cột Chốt.";
  if (lead.convertedStudentId) return "Lead này đã thành học viên.";
  const created = await createStudent({ name: lead.name, phone: lead.phone, branchId });
  if (created.error || !created.id) return created.error || "Không tạo được học viên.";
  await db.leads.update(id, {
    convertedStudentId: created.id,
    activities: [...lead.activities, { day: localDayKey(), text: "Chuyển thành học viên.", kind: "note" }],
  });
  return "";
}

export async function setAttendance(input: {
  classId: string;
  studentId: string;
  day: string;
  status: AttendStatus;
  sessionId?: string;
}) {
  const id = `${input.classId}_${input.studentId}_${input.day}`;
  const prev = await db.attendance.get(id);
  const student = await db.students.get(input.studentId);
  if (!student) return;
  const session = input.sessionId
    ? await db.sessions.get(input.sessionId)
    : await db.sessions.filter((s) => s.classId === input.classId && s.day === input.day).first();
  const cancelled = session?.status === "cancelled";
  const prevDeduct = Boolean(prev && !prev.waived && deductsCredit(prev.status));
  const nowDeduct = !cancelled && deductsCredit(input.status);
  let remaining = student.remainingSessions;
  if (!prevDeduct && nowDeduct) remaining = Math.max(0, remaining - 1);
  if (prevDeduct && !nowDeduct) remaining += 1;
  await db.transaction("rw", [db.attendance, db.students], async () => {
    await db.attendance.put({
      id,
      classId: input.classId,
      studentId: input.studentId,
      day: input.day,
      status: input.status,
      sessionId: session?.id ?? input.sessionId ?? "",
      waived: cancelled,
    });
    if (remaining !== student.remainingSessions) {
      await db.students.update(input.studentId, { remainingSessions: remaining });
    }
  });
}

export async function restoreAttendance(input: {
  classId: string;
  studentId: string;
  day: string;
  previous: {
    id: string;
    classId: string;
    studentId: string;
    day: string;
    status: AttendStatus;
    sessionId: string;
    waived: boolean;
  } | null;
  previousRemaining: number;
}) {
  const id = `${input.classId}_${input.studentId}_${input.day}`;
  await db.transaction("rw", [db.attendance, db.students], async () => {
    if (input.previous) await db.attendance.put(input.previous);
    else await db.attendance.delete(id);
    await db.students.update(input.studentId, { remainingSessions: input.previousRemaining });
  });
}

export async function toggleTask(id: string, done: boolean) {
  await db.tasks.update(id, { status: done ? "done" : "todo" });
}

export async function createTaskParent(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "fields" as const };
  const id = uid("tp");
  await db.taskParents.add({ id, name: trimmed });
  return { id };
}

export async function createTask(input: {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  branchId?: string;
  parentId?: string;
  dueDay?: string;
  note?: string;
}) {
  const title = input.title.trim();
  if (!title) return "fields";
  await db.tasks.add({
    id: uid("tk"),
    title,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    assigneeId: input.assigneeId ?? "",
    branchId: input.branchId ?? "",
    parentId: input.parentId ?? "",
    dueDay: input.dueDay || localDayKey(),
    note: (input.note ?? "").trim(),
    comments: [],
  });
  return "";
}

export async function addTaskComment(input: { taskId: string; actorId: string; text: string }) {
  const task = await db.tasks.get(input.taskId);
  const text = input.text.trim();
  if (!task || !text || !input.actorId) return "fields";
  await db.tasks.update(input.taskId, {
    comments: [
      ...(task.comments ?? []),
      { id: uid("tc"), day: localDayKey(), actorId: input.actorId, text },
    ],
  });
  return "";
}

export async function updateTask(input: {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  branchId: string;
  parentId: string;
  dueDay: string;
  note: string;
}) {
  const title = input.title.trim();
  if (!title || !input.dueDay) return "fields";
  await db.tasks.update(input.id, {
    title,
    status: input.status,
    priority: input.priority,
    assigneeId: input.assigneeId,
    branchId: input.branchId,
    parentId: input.parentId,
    dueDay: input.dueDay,
    note: input.note.trim(),
  });
  return "";
}

export async function moveTaskStatus(id: string, status: TaskStatus) {
  await db.tasks.update(id, { status });
}

export async function payReceivable(input: {
  receivableId: string;
  amount: number;
  method: PayMethod;
  billNote?: string;
  billImage?: string;
  note?: string;
}) {
  const row = await db.receivables.get(input.receivableId);
  if (!row) return "Không thấy khoản phải thu.";
  const room = Math.max(0, row.amount - row.paid);
  const amount = Math.min(room, Math.max(0, Math.round(input.amount)));
  if (amount <= 0) return "Số tiền không hợp lệ.";
  const student = await db.students.get(row.studentId);
  const id = uid("pay");
  const day = localDayKey();
  await db.transaction("rw", [db.receivables, db.payments, db.students], async () => {
    await db.receivables.update(row.id, { paid: row.paid + amount });
    await db.payments.add({
      id,
      studentId: row.studentId,
      branchId: row.branchId || student?.branchId || "",
      amount,
      method: input.method,
      day,
      note: input.note?.trim() || `Thu ${row.title}`,
      billNote: input.billNote?.trim() ?? "",
      billImage: input.billImage || "",
    });
    if (student) {
      await db.students.update(student.id, {
        debt: Math.max(0, student.debt - amount),
      });
    }
  });
  return { id, amount, day, title: row.title, studentName: student?.name ?? "" };
}

export async function addPackage(input: {
  name: string;
  sessions: number;
  price: number;
  note: string;
}) {
  await db.packages.add({
    id: uid("pkg"),
    name: input.name.trim(),
    sessions: input.sessions,
    months: Math.max(1, Math.round(input.sessions / 8)),
    price: input.price,
    note: input.note.trim(),
    kind: "course",
    deposit: 0,
  });
}

export async function enrollStudent(input: {
  studentId: string;
  packageId: string;
  classId: string;
}) {
  const pack = await db.packages.get(input.packageId);
  const student = await db.students.get(input.studentId);
  if (!pack || !student || pack.kind === "hold") return "Gói này không dùng để ghi danh khóa.";
  const klass = await db.classes.get(input.classId);
  const course = klass ? await db.courses.get(klass.courseId) : undefined;
  if (!klass || !course) return "Không thấy lớp.";
  const sessions = await db.sessions.where("classId").equals(klass.id).toArray();
  const today = localDayKey();
  const next = [...sessions]
    .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.day >= today)
    .sort((a, b) => a.index - b.index)[0];
  if (!next) return "Khóa đã hết buổi.";
  const gate = canJoinAtSession(course.level, next.index);
  if (!gate.ok) return gate.reason;
  const seated = await db.students.filter((s) => s.classId === klass.id).count();
  if (student.classId !== klass.id && seated >= klass.capacity) return "Lớp đã đủ chỗ.";
  const day = localDayKey();
  await db.transaction("rw", [db.enrollments, db.students, db.receivables], async () => {
    await db.enrollments.add({
      id: uid("en"),
      studentId: input.studentId,
      packageId: input.packageId,
      classId: input.classId,
      day,
      sessions: pack.sessions,
    });
    await db.students.update(student.id, {
      packageId: pack.id,
      classId: input.classId,
      courseId: course.id,
      branchId: klass.branchId,
      level: course.level,
      remainingSessions: student.remainingSessions + pack.sessions,
      debt: student.debt + pack.price,
      status: student.status === "paused" ? "active" : student.status,
    });
    await db.receivables.add({
      id: uid("debt"),
      studentId: student.id,
      branchId: klass.branchId,
      title: pack.name,
      amount: pack.price,
      paid: 0,
      dueDay: day,
    });
  });
  return "";
}

const avatarColors = ["#F97316", "#0EA5E9", "#7C3AED", "#059669", "#DB2777"];

export async function createStudent(input: { name: string; phone: string; branchId: string }) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) return { id: "", error: "Nhập tên học viên." };
  if (!phone) return { id: "", error: "Nhập số điện thoại." };
  if (!input.branchId) return { id: "", error: "Chọn chi nhánh." };
  const id = uid("s");
  await db.students.add({
    id,
    name,
    phone,
    email: "",
    birthDay: "",
    avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)] ?? "#F97316",
    status: "active",
    packageId: "",
    classId: "",
    courseId: "",
    branchId: input.branchId,
    level: "begin",
    remainingSessions: 0,
    debt: 0,
    parentName: "",
    parentPhone: "",
    flagged: false,
    joinedDay: localDayKey(),
    notes: [],
  });
  return { id, error: "" };
}

export async function enrollMidCourse(input: {
  studentId: string;
  packageId: string;
  classId: string;
  payNow?: number;
  method?: PayMethod;
}) {
  const pack = await db.packages.get(input.packageId);
  const student = await db.students.get(input.studentId);
  if (!pack || !student || pack.kind === "hold") return "Gói này không dùng để ghi danh khóa.";
  const klass = await db.classes.get(input.classId);
  const course = klass ? await db.courses.get(klass.courseId) : undefined;
  if (!klass || !course) return "Không thấy lớp.";
  const sessions = await db.sessions.where("classId").equals(klass.id).toArray();
  const today = localDayKey();
  const next = [...sessions]
    .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.day >= today)
    .sort((a, b) => a.index - b.index)[0];
  if (!next) return "Khóa đã hết buổi.";
  const gate = canJoinAtSession(course.level, next.index);
  if (!gate.ok) return gate.reason;
  const granted = sessions.filter((s) => s.index >= next.index && s.status !== "cancelled").length;
  if (granted <= 0) return "Khóa không còn buổi để vào.";
  const seated = await db.students.filter((s) => s.classId === klass.id).count();
  if (student.classId !== klass.id && seated >= klass.capacity) return "Lớp đã đủ chỗ.";
  const price = Math.round((pack.price * granted) / Math.max(1, pack.sessions));
  const pay = Math.min(price, Math.max(0, Math.round(input.payNow ?? 0)));
  await db.transaction("rw", [db.enrollments, db.students, db.receivables, db.payments], async () => {
    await db.enrollments.add({
      id: uid("en"),
      studentId: input.studentId,
      packageId: input.packageId,
      classId: input.classId,
      day: today,
      sessions: granted,
    });
    await db.students.update(student.id, {
      packageId: pack.id,
      classId: input.classId,
      courseId: course.id,
      branchId: klass.branchId,
      level: course.level,
      remainingSessions: student.remainingSessions + granted,
      debt: student.debt + price - pay,
      status: student.status === "paused" ? "active" : student.status,
    });
    await db.receivables.add({
      id: uid("debt"),
      studentId: student.id,
      branchId: klass.branchId,
      title: `${pack.name} · ${granted} buổi`,
      amount: price,
      paid: pay,
      dueDay: today,
    });
    if (pay > 0) {
      await db.payments.add({
        id: uid("pay"),
        studentId: student.id,
        branchId: klass.branchId,
        amount: pay,
        method: input.method ?? "cash",
        day: today,
        note: `Thu ghi danh ${course.name}`,
        billNote: "",
      });
    }
  });
  return "";
}

export async function decideHold(id: string, status: "approved" | "rejected", role: Role, actorId: string, rejectReason = "") {
  if (role !== "owner") return "Chỉ Quản lý duyệt bảo lưu.";
  const hold = await db.holds.get(id);
  if (!hold || hold.status !== "pending") return "Phiếu không còn chờ duyệt.";
  if (status === "rejected" && !rejectReason.trim()) return "Nhập lý do từ chối.";
  if (status === "approved" && hold.needsPackage) {
    const bought = await db.enrollments
      .filter((e) => e.studentId === hold.studentId && e.packageId === "phold")
      .first();
    if (!bought) return "Gói dưới 3 tháng phải mua gói bảo lưu trước khi duyệt.";
  }
  await db.holds.update(id, {
    status,
    approverId: actorId,
    decidedDay: localDayKey(),
    rejectReason: status === "rejected" ? rejectReason.trim() : "",
  });
  return "";
}

export async function endHoldEarly(id: string, role: Role, actorId: string) {
  if (role !== "owner") return "Chỉ Quản lý kết thúc bảo lưu.";
  const hold = await db.holds.get(id);
  if (!hold || hold.status !== "approved") return "Phiếu không đang bảo lưu.";
  await db.holds.update(id, {
    status: "done",
    toDay: localDayKey(),
    approverId: actorId,
    decidedDay: localDayKey(),
  });
  return "";
}

export async function updateSession(input: {
  sessionId: string;
  actorId: string;
  teacherId?: string;
  roomId?: string;
}) {
  const session = await db.sessions.get(input.sessionId);
  if (!session) return "Không thấy buổi.";
  const bits: string[] = [];
  const patch: Partial<typeof session> = {};
  if (input.teacherId && input.teacherId !== session.teacherId) {
    patch.teacherId = input.teacherId;
    bits.push("đổi giáo viên");
  }
  if (input.roomId && input.roomId !== session.roomId) {
    patch.roomId = input.roomId;
    const room = await db.rooms.get(input.roomId);
    if (room) patch.branchId = room.branchId;
    bits.push("đổi phòng");
  }
  if (bits.length === 0) return "";
  const all = await db.sessions.toArray();
  const clash = conflictLabel(all, {
    id: session.id,
    day: session.day,
    start: session.start,
    end: session.end,
    teacherId: patch.teacherId ?? session.teacherId,
    roomId: patch.roomId ?? session.roomId,
  });
  if (clash) return clash;
  await db.transaction("rw", [db.sessions, db.audits], async () => {
    await db.sessions.update(session.id, patch);
    await db.audits.add({
      id: uid("aud"),
      sessionId: session.id,
      day: localDayKey(),
      actorId: input.actorId,
      text: `Buổi ${session.index}: ${bits.join(", ")}.`,
    });
  });
  return "";
}

export async function moveSession(input: {
  sessionId: string;
  actorId: string;
  day: string;
  start: string;
  end: string;
  teacherId: string;
  roomId: string;
  branchId: string;
}) {
  const session = await db.sessions.get(input.sessionId);
  if (!session) return "Không thấy buổi.";
  if (session.status === "cancelled" || session.status === "completed") return "Buổi này không dời được.";
  const all = await db.sessions.toArray();
  const clash = conflictLabel(all, input);
  if (clash) return clash;
  await db.transaction("rw", [db.sessions, db.audits], async () => {
    await db.sessions.update(session.id, {
      day: input.day,
      start: input.start,
      end: input.end,
      teacherId: input.teacherId,
      roomId: input.roomId,
      branchId: input.branchId,
      status: sessionStatus(input.day, session.index),
    });
    await db.audits.add({
      id: uid("aud"),
      sessionId: session.id,
      day: localDayKey(),
      actorId: input.actorId,
      text: `Dời buổi ${session.index} sang ${input.day} ${input.start}–${input.end}.`,
    });
  });
  return "";
}

export async function addOneOffSession(input: {
  actorId: string;
  courseId: string;
  day: string;
  start: string;
  end: string;
  teacherId: string;
  roomId: string;
}) {
  const course = await db.courses.get(input.courseId);
  const room = await db.rooms.get(input.roomId);
  if (!course || !room) return "Thiếu khóa hoặc phòng.";
  if (input.start >= input.end) return "Giờ kết thúc phải sau giờ bắt đầu.";
  const all = await db.sessions.toArray();
  const clash = conflictLabel(all, { ...input, roomId: room.id });
  if (clash) return clash;
  const index = all.filter((s) => s.classId === course.classId).reduce((m, s) => Math.max(m, s.index), 0) + 1;
  const id = uid("ss");
  await db.transaction("rw", [db.sessions, db.audits], async () => {
    await db.sessions.add({
      id,
      courseId: course.id,
      classId: course.classId,
      branchId: room.branchId,
      index,
      day: input.day,
      start: input.start,
      end: input.end,
      teacherId: input.teacherId,
      roomId: room.id,
      status: sessionStatus(input.day, index),
      note: "Buổi lẻ",
    });
    await db.audits.add({
      id: uid("aud"),
      sessionId: id,
      day: localDayKey(),
      actorId: input.actorId,
      text: `Tạo buổi lẻ ${input.day} ${input.start}–${input.end}.`,
    });
  });
  return "";
}

export async function syncSessionClock() {
  const today = localDayKey();
  const rows = await db.sessions.toArray();
  await db.transaction("rw", db.sessions, async () => {
    for (const row of rows) {
      if (row.status === "cancelled") continue;
      const next = row.day < today ? "completed" : row.day === today ? "ongoing" : "upcoming";
      if (next !== row.status) await db.sessions.update(row.id, { status: next });
    }
  });
}

export async function moveStudentClass(studentId: string, classId: string) {
  const student = await db.students.get(studentId);
  const klass = await db.classes.get(classId);
  const course = klass ? await db.courses.get(klass.courseId) : undefined;
  if (!student || !klass || !course) return "Không thấy lớp.";
  if (student.classId === classId) return "";
  const seated = await db.students.filter((s) => s.classId === klass.id).count();
  if (seated >= klass.capacity) return "Lớp đã đủ chỗ.";
  await db.students.update(student.id, {
    classId: klass.id,
    courseId: course.id,
    branchId: klass.branchId,
    level: course.level,
  });
  return "";
}

export async function addStudentNote(studentId: string, text: string) {
  const student = await db.students.get(studentId);
  const note = text.trim();
  if (!student || !note) return;
  await db.students.update(studentId, {
    notes: [...student.notes, { day: localDayKey(), text: note }],
  });
}

export async function setStudentsFlag(ids: string[], flagged: boolean) {
  await db.transaction("rw", db.students, async () => {
    for (const id of ids) await db.students.update(id, { flagged });
  });
}

export async function cancelSession(sessionId: string, actorId: string, reason: string) {
  const session = await db.sessions.get(sessionId);
  if (!session || session.status === "cancelled") return;
  const marks = await db.attendance.filter((a) => a.classId === session.classId && a.day === session.day).toArray();
  await db.transaction("rw", [db.sessions, db.attendance, db.students, db.audits], async () => {
    await db.sessions.update(session.id, { status: "cancelled", note: reason.trim() || "Hủy buổi" });
    for (const mark of marks) {
      if (mark.waived || !deductsCredit(mark.status)) continue;
      const student = await db.students.get(mark.studentId);
      if (student) {
        await db.students.update(student.id, { remainingSessions: student.remainingSessions + 1 });
      }
      await db.attendance.update(mark.id, { waived: true });
    }
    await db.audits.add({
      id: uid("aud"),
      sessionId: session.id,
      day: localDayKey(),
      actorId,
      text: `Hủy buổi ${session.index}: ${reason.trim() || "ốm / lễ"}. Không trừ buổi.`,
    });
  });
}

const TEACHER_COLORS = ["#F97316", "#2563EB", "#7C3AED", "#0891B2", "#0F766E"];

function slotLine(weekdays: number[], start: string) {
  const days = [...weekdays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return `${days.map((day) => weekdayShort(day, "vi")).join(" · ")} · ${start}`;
}

export async function createCourse(input: {
  name: string;
  style: string;
  level: Level;
  branchId: string;
  teacherId: string;
  roomId: string;
  weekdays: number[];
  start: string;
  end: string;
  description: string;
}) {
  const name = input.name.trim();
  if (!name || !input.teacherId || !input.roomId || !input.branchId) return "fields";
  if (input.weekdays.length === 0) return "weekday";
  const room = await db.rooms.get(input.roomId);
  if (!room || room.branchId !== input.branchId) return "room";
  const startDay = localDayKey();
  const days = sessionDates(startDay, input.weekdays, 8);
  const courseId = uid("k");
  const classId = uid("c");
  const weekday = [...input.weekdays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))[0] ?? 1;
  await db.transaction("rw", [db.courses, db.classes, db.sessions], async () => {
    await db.courses.add({
      id: courseId,
      name,
      style: input.style.trim() || name,
      level: input.level,
      slot: slotLine(input.weekdays, input.start),
      teacherId: input.teacherId,
      branchId: input.branchId,
      roomId: input.roomId,
      classId,
      startDay,
      endDay: days[days.length - 1] ?? startDay,
      weekdays: input.weekdays,
      start: input.start,
      end: input.end,
      description: input.description.trim(),
      active: true,
    });
    await db.classes.add({
      id: classId,
      name,
      courseId,
      branchId: input.branchId,
      teacherId: input.teacherId,
      roomId: input.roomId,
      room: room.name,
      capacity: 12,
      level: input.level,
      weekday,
      start: input.start,
      end: input.end,
      active: true,
    });
    for (const [i, day] of days.entries()) {
      const index = i + 1;
      await db.sessions.add({
        id: uid("s"),
        courseId,
        classId,
        branchId: input.branchId,
        index,
        day,
        start: input.start,
        end: input.end,
        teacherId: input.teacherId,
        roomId: input.roomId,
        status: sessionStatus(day, index),
        note: "",
      });
    }
  });
  return "";
}

export async function updateCourse(input: {
  id: string;
  name: string;
  style: string;
  level: Level;
  description: string;
  teacherId: string;
  roomId: string;
  start: string;
  end: string;
  active: boolean;
}) {
  const course = await db.courses.get(input.id);
  const room = await db.rooms.get(input.roomId);
  if (!course || !input.name.trim() || !input.teacherId || !room) return "fields";
  if (room.branchId !== course.branchId) return "room";
  const today = localDayKey();
  const sessions = await db.sessions.where("courseId").equals(course.id).toArray();
  await db.transaction("rw", [db.courses, db.classes, db.sessions], async () => {
    await db.courses.update(course.id, {
      name: input.name.trim(),
      style: input.style.trim() || input.name.trim(),
      level: input.level,
      description: input.description.trim(),
      teacherId: input.teacherId,
      roomId: room.id,
      start: input.start,
      end: input.end,
      active: input.active,
      slot: slotLine(course.weekdays, input.start),
    });
    await db.classes.update(course.classId, {
      name: input.name.trim(),
      level: input.level,
      teacherId: input.teacherId,
      roomId: room.id,
      room: room.name,
      start: input.start,
      end: input.end,
      active: input.active,
    });
    for (const session of sessions) {
      if (session.day < today || session.status === "cancelled" || session.status === "completed") continue;
      await db.sessions.update(session.id, {
        teacherId: input.teacherId,
        roomId: room.id,
        start: input.start,
        end: input.end,
      });
    }
  });
  return "";
}

export async function updateClass(input: {
  id: string;
  capacity: number;
  teacherId: string;
  roomId: string;
  start: string;
  end: string;
}) {
  const klass = await db.classes.get(input.id);
  const room = await db.rooms.get(input.roomId);
  if (!klass || !input.teacherId || !room || input.capacity < 1) return "fields";
  if (room.branchId !== klass.branchId) return "room";
  const today = localDayKey();
  const sessions = await db.sessions.where("classId").equals(klass.id).toArray();
  await db.transaction("rw", [db.classes, db.courses, db.sessions], async () => {
    await db.classes.update(klass.id, {
      capacity: input.capacity,
      teacherId: input.teacherId,
      roomId: room.id,
      room: room.name,
      start: input.start,
      end: input.end,
    });
    const course = await db.courses.get(klass.courseId);
    if (course && course.classId === klass.id) {
      await db.courses.update(course.id, {
        teacherId: input.teacherId,
        roomId: room.id,
        start: input.start,
        end: input.end,
        slot: slotLine(course.weekdays, input.start),
      });
    }
    for (const session of sessions) {
      if (session.day < today || session.status === "cancelled" || session.status === "completed") continue;
      await db.sessions.update(session.id, {
        teacherId: input.teacherId,
        roomId: room.id,
        start: input.start,
        end: input.end,
      });
    }
  });
  return "";
}

export async function createRoom(input: {
  name: string;
  branchId: string;
  floor: string;
  capacity: number;
  note: string;
}) {
  const name = input.name.trim();
  if (!name || !input.branchId || input.capacity < 1) return "fields";
  await db.rooms.add({
    id: uid("r"),
    name,
    branchId: input.branchId,
    floor: input.floor.trim(),
    capacity: input.capacity,
    note: input.note.trim(),
  });
  return "";
}

export async function updateRoom(input: {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  note: string;
}) {
  const room = await db.rooms.get(input.id);
  if (!room || !input.name.trim() || input.capacity < 1) return "fields";
  const name = input.name.trim();
  await db.transaction("rw", [db.rooms, db.classes], async () => {
    await db.rooms.update(room.id, {
      name,
      floor: input.floor.trim(),
      capacity: input.capacity,
      note: input.note.trim(),
    });
    const classes = await db.classes.filter((klass) => klass.roomId === room.id).toArray();
    for (const klass of classes) await db.classes.update(klass.id, { room: name });
  });
  return "";
}

export async function createTeacher(input: { name: string; phone: string }) {
  const name = input.name.trim();
  if (!name) return "fields";
  const id = uid("u");
  const count = await db.users.where("role").equals("teacher").count();
  await db.users.add({
    id,
    name,
    phone: input.phone.trim(),
    email: `${id}@demo.local`,
    role: "teacher",
    pin: `locked-${id}`,
    avatarColor: TEACHER_COLORS[count % TEACHER_COLORS.length],
  });
  return "";
}

export async function updateTeacher(input: { id: string; name: string; phone: string }) {
  const user = await db.users.get(input.id);
  if (!user || user.role !== "teacher" || !input.name.trim()) return "fields";
  await db.users.update(user.id, { name: input.name.trim(), phone: input.phone.trim() });
  return "";
}
