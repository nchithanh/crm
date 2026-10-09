import { db } from "@/lib/db";
import { canJoinAtSession, deductsCredit } from "@/lib/rules";
import { conflictLabel, sessionDates, sessionStatus } from "@/lib/schedule";
import { isSubscriptionValid } from "@/lib/subscription";
import { localDayKey, uid, weekdayShort } from "@/lib/utils";
import type { AttendStatus, LeadStage, Level, PayMethod, Role, TaskPriority, TaskStatus, TeacherStatus, User } from "@/types";

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
  status: AttendStatus;
  personId?: string;
  subject?: "student" | "teacher";
  /** @deprecated */
  studentId?: string;
  day?: string;
  sessionId?: string;
}) {
  const personId = input.personId || input.studentId || "";
  const subject = input.subject ?? "student";
  const klass = await db.classes.get(input.classId);
  if (!klass || !personId) return "fields";
  const id = `${input.classId}_${subject}_${personId}`;
  const prev = await db.attendance.get(id);
  const cancelled = klass.status === "cancelled";
  const prevDeduct = Boolean(prev && !prev.waived && deductsCredit(prev.status));
  const nowDeduct = !cancelled && subject === "student" && deductsCredit(input.status);
  const student = subject === "student" ? await db.students.get(personId) : undefined;
  // New credit deduction requires a valid subscription for this course.
  if (student && nowDeduct && !prevDeduct) {
    const sub = student.subscriptionId ? await db.subscriptions.get(student.subscriptionId) : undefined;
    if (!isSubscriptionValid(sub, { day: klass.day, courseId: klass.courseId })) {
      return "subscription";
    }
  }
  let remaining = student?.remainingSessions ?? 0;
  if (student) {
    if (!prevDeduct && nowDeduct) remaining = Math.max(0, remaining - 1);
    if (prevDeduct && !nowDeduct) remaining += 1;
  }
  await db.transaction("rw", [db.attendance, db.students, db.subscriptions], async () => {
    await db.attendance.put({
      id,
      classId: input.classId,
      personId,
      subject,
      day: klass.day,
      status: input.status,
      waived: cancelled,
    });
    if (student && remaining !== student.remainingSessions) {
      await db.students.update(personId, { remainingSessions: remaining });
      if (student.subscriptionId) {
        const patch: { remainingSessions: number; status?: "active" | "expired" } = { remainingSessions: remaining };
        if (remaining <= 0) patch.status = "expired";
        await db.subscriptions.update(student.subscriptionId, patch);
      }
    }
  });
  return "";
}

export async function restoreAttendance(input: {
  classId: string;
  previousRemaining: number;
  personId?: string;
  subject?: "student" | "teacher";
  studentId?: string;
  day?: string;
  previous: {
    id: string;
    classId: string;
    personId: string;
    subject: "student" | "teacher";
    day: string;
    status: AttendStatus;
    waived: boolean;
  } | null;
}) {
  const personId = input.personId || input.studentId || "";
  const subject = input.subject ?? "student";
  const id = `${input.classId}_${subject}_${personId}`;
  await db.transaction("rw", [db.attendance, db.students], async () => {
    if (input.previous) await db.attendance.put(input.previous);
    else await db.attendance.delete(id);
    if (subject === "student" && personId) {
      await db.students.update(personId, { remainingSessions: input.previousRemaining });
    }
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
  const row = await db.installments.get(input.receivableId);
  if (!row) return "Không thấy khoản phải thu.";
  const room = Math.max(0, row.amount - row.paid);
  const amount = Math.min(room, Math.max(0, Math.round(input.amount)));
  if (amount <= 0) return "Số tiền không hợp lệ.";
  const student = await db.students.get(row.studentId);
  const id = uid("pay");
  const day = localDayKey();
  await db.transaction("rw", [db.installments, db.payments, db.students], async () => {
    await db.installments.update(row.id, { paid: row.paid + amount });
    await db.payments.add({
      id,
      studentId: row.studentId,
      subscriptionId: row.subscriptionId || student?.subscriptionId || "",
      installmentId: row.id,
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
  await db.subscriptionPlans.add({
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
  planId: string;
  courseId: string;
  /** @deprecated */
  packageId?: string;
  classId?: string;
}) {
  const planId = input.planId || input.packageId || "";
  const pack = await db.subscriptionPlans.get(planId);
  const student = await db.students.get(input.studentId);
  if (!pack || !student || pack.kind === "hold") return "Gói này không dùng để ghi danh khóa.";
  let courseId = input.courseId || "";
  if (!courseId && input.classId) {
    const fromClass = await db.classes.get(input.classId);
    if (fromClass) courseId = fromClass.courseId;
    else if (await db.courses.get(input.classId)) courseId = input.classId;
  }
  const course = await db.courses.get(courseId);
  if (!course) return "Không thấy khóa.";
  const classes = await db.classes.where("courseId").equals(course.id).toArray();
  const today = localDayKey();
  const next = [...classes]
    .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.day >= today)
    .sort((a, b) => a.index - b.index)[0];
  if (!next) return "Khóa đã hết buổi.";
  const gate = canJoinAtSession(course.level, next.index);
  if (!gate.ok) return gate.reason;
  const day = localDayKey();
  const end = new Date();
  end.setMonth(end.getMonth() + pack.months);
  const endDay = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const subId = uid("sub");
  const debtId = uid("debt");
  await db.transaction("rw", [db.subscriptions, db.students, db.installments, db.classStudents, db.classes], async () => {
    await db.subscriptions.add({
      id: subId,
      studentId: input.studentId,
      courseId: course.id,
      planId: pack.id,
      day,
      endDay,
      sessions: pack.sessions,
      remainingSessions: pack.sessions,
      status: "active",
    });
    await db.students.update(student.id, {
      subscriptionId: subId,
      courseId: course.id,
      branchId: course.branchId,
      level: course.level,
      remainingSessions: student.remainingSessions + pack.sessions,
      debt: student.debt + pack.price,
      status: student.status === "paused" ? "active" : student.status,
    });
    await db.installments.add({
      id: debtId,
      subscriptionId: subId,
      studentId: student.id,
      branchId: course.branchId,
      title: pack.name,
      amount: pack.price,
      paid: 0,
      dueDay: day,
    });
    for (const klass of classes.filter((c) => c.status !== "cancelled" && c.day >= today)) {
      const csId = `${klass.id}_${student.id}`;
      const exists = await db.classStudents.get(csId);
      if (!exists) await db.classStudents.add({ id: csId, classId: klass.id, studentId: student.id });
    }
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
    subscriptionId: "",
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
  planId?: string;
  packageId?: string;
  courseId?: string;
  classId?: string;
  payNow?: number;
  method?: PayMethod;
}) {
  return enrollStudent({
    studentId: input.studentId,
    planId: input.planId || input.packageId || "",
    courseId: input.courseId || "",
    classId: input.classId,
    packageId: input.packageId,
  });
}

export async function requestHold(input: {
  studentId: string;
  fromDay: string;
  toDay: string;
  reason: string;
  credits?: number;
}) {
  const student = await db.students.get(input.studentId);
  if (!student) return "Không thấy học viên.";
  if (student.status === "paused") return "Học viên đang nghỉ.";
  const open = await db.holds
    .where("studentId")
    .equals(input.studentId)
    .filter((h) => h.status === "pending" || h.status === "approved")
    .first();
  if (open) return "Đã có phiếu bảo lưu đang mở.";
  const reason = input.reason.trim();
  if (!input.fromDay || !input.toDay || !reason) return "fields";
  if (input.toDay < input.fromDay) return "Ngày kết thúc phải sau ngày bắt đầu.";
  await db.holds.add({
    id: uid("hold"),
    studentId: input.studentId,
    fromDay: input.fromDay,
    toDay: input.toDay,
    reason,
    status: "pending",
    credits: input.credits ?? Math.min(4, Math.max(1, student.remainingSessions || 1)),
    needsPackage: false,
  });
  return "";
}

export async function decideHold(id: string, status: "approved" | "rejected", role: Role, actorId: string, rejectReason = "") {
  if (role !== "owner") return "Chỉ Quản lý duyệt bảo lưu.";
  const hold = await db.holds.get(id);
  if (!hold || hold.status !== "pending") return "Phiếu không còn chờ duyệt.";
  if (status === "rejected" && !rejectReason.trim()) return "Nhập lý do từ chối.";
  if (status === "approved" && hold.needsPackage) {
    const bought = await db.subscriptions
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
  const session = await db.classes.get(input.sessionId);
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
  const all = await db.classes.toArray();
  const clash = conflictLabel(all, {
    id: session.id,
    day: session.day,
    start: session.start,
    end: session.end,
    teacherId: patch.teacherId ?? session.teacherId,
    roomId: patch.roomId ?? session.roomId,
  });
  if (clash) return clash;
  await db.classes.update(session.id, patch);
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
  const session = await db.classes.get(input.sessionId);
  if (!session) return "Không thấy buổi.";
  if (session.status === "cancelled" || session.status === "completed") return "Buổi này không dời được.";
  const all = await db.classes.toArray();
  const clash = conflictLabel(all, input);
  if (clash) return clash;
  await db.classes.update(session.id, {
    day: input.day,
    start: input.start,
    end: input.end,
    teacherId: input.teacherId,
    roomId: input.roomId,
    branchId: input.branchId,
    status: sessionStatus(input.day, session.index),
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
  const room = input.roomId ? await db.rooms.get(input.roomId) : undefined;
  if (!course) return "Thiếu khóa.";
  if (input.start >= input.end) return "Giờ kết thúc phải sau giờ bắt đầu.";
  const all = await db.classes.toArray();
  const clash = conflictLabel(all, { ...input, roomId: input.roomId || "" });
  if (clash) return clash;
  const index = all.filter((s) => s.courseId === course.id).reduce((m, s) => Math.max(m, s.index), 0) + 1;
  const id = `${course.id}-c${index}`;
  await db.classes.add({
    id,
    courseId: course.id,
    branchId: room?.branchId ?? course.branchId,
    index,
    name: `${course.name} · #${index}`,
    day: input.day,
    start: input.start,
    end: input.end,
    teacherId: input.teacherId,
    roomId: room?.id ?? "",
    status: sessionStatus(input.day, index),
    capacity: 12,
    note: "Buổi lẻ",
  });
  return "";
}

export async function syncSessionClock() {
  const today = localDayKey();
  const rows = await db.classes.toArray();
  await db.transaction("rw", db.classes, async () => {
    for (const row of rows) {
      if (row.status === "cancelled") continue;
      const next = row.day < today ? "completed" : row.day === today ? "ongoing" : "upcoming";
      if (next !== row.status) await db.classes.update(row.id, { status: next });
    }
  });
}

export async function moveStudentClass(studentId: string, classId: string) {
  const student = await db.students.get(studentId);
  const klass = await db.classes.get(classId);
  const course = klass ? await db.courses.get(klass.courseId) : undefined;
  if (!student || !klass || !course) return "Không thấy buổi.";
  const seated = await db.classStudents.where("classId").equals(klass.id).count();
  if (seated >= klass.capacity) return "Lớp đã đủ chỗ.";
  await db.transaction("rw", [db.students, db.classStudents], async () => {
    await db.students.update(student.id, {
      courseId: course.id,
      branchId: klass.branchId,
      level: course.level,
    });
    const csId = `${klass.id}_${student.id}`;
    if (!(await db.classStudents.get(csId))) {
      await db.classStudents.add({ id: csId, classId: klass.id, studentId: student.id });
    }
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
  const session = await db.classes.get(sessionId);
  if (!session || session.status === "cancelled") return;
  const marks = await db.attendance.where("classId").equals(session.id).toArray();
  await db.transaction("rw", [db.classes, db.attendance, db.students, db.subscriptions], async () => {
    await db.classes.update(session.id, { status: "cancelled", note: reason.trim() || "Hủy buổi" });
    for (const mark of marks) {
      if (mark.waived || mark.subject !== "student" || !deductsCredit(mark.status)) continue;
      const student = await db.students.get(mark.personId);
      if (student) {
        const remaining = student.remainingSessions + 1;
        await db.students.update(student.id, { remainingSessions: remaining });
        if (student.subscriptionId) {
          await db.subscriptions.update(student.subscriptionId, { remainingSessions: remaining });
        }
      }
      await db.attendance.update(mark.id, { waived: true });
    }
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
  roomId?: string;
  weekdays: number[];
  start: string;
  end: string;
  description: string;
  sessionCount?: number;
  capacity?: number;
  assistantIds?: string[];
  startDay?: string;
}) {
  const name = input.name.trim();
  if (!name || !input.teacherId || !input.branchId) return "fields";
  if (input.weekdays.length === 0) return "weekday";
  const capacity = Math.max(1, Math.round(input.capacity ?? 12));
  const roomId = input.roomId ?? "";
  if (roomId) {
    const room = await db.rooms.get(roomId);
    if (!room || room.branchId !== input.branchId) return "room";
  }
  const startDay = input.startDay?.trim() || localDayKey();
  const count = input.sessionCount ?? 8;
  const days = sessionDates(startDay, input.weekdays, count);
  const courseId = uid("k");
  await db.transaction("rw", [db.courses, db.classes, db.courseTeachers, db.courseRooms], async () => {
    await db.courses.add({
      id: courseId,
      name,
      style: input.style.trim() || name,
      level: input.level,
      slot: slotLine(input.weekdays, input.start),
      teacherId: input.teacherId,
      branchId: input.branchId,
      roomId,
      startDay,
      endDay: days[days.length - 1] ?? startDay,
      weekdays: input.weekdays,
      start: input.start,
      end: input.end,
      sessionCount: count,
      capacity,
      durationMonths: 1,
      description: input.description.trim(),
      active: true,
    });
    await db.courseTeachers.add({
      id: uid("ct"),
      courseId,
      teacherId: input.teacherId,
      role: "main",
    });
    for (const aid of input.assistantIds ?? []) {
      await db.courseTeachers.add({ id: uid("ct"), courseId, teacherId: aid, role: "assistant" });
    }
    if (roomId) {
      await db.courseRooms.add({ id: uid("cr"), courseId, roomId });
    }
    for (const [i, day] of days.entries()) {
      const index = i + 1;
      await db.classes.add({
        id: `${courseId}-c${index}`,
        courseId,
        branchId: input.branchId,
        index,
        name: `${name} · #${index}`,
        day,
        start: input.start,
        end: input.end,
        teacherId: input.teacherId,
        roomId,
        status: sessionStatus(day, index),
        capacity,
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
  roomId?: string;
  start: string;
  end: string;
  active: boolean;
}) {
  const course = await db.courses.get(input.id);
  if (!course || !input.name.trim() || !input.teacherId) return "fields";
  const roomId = input.roomId ?? course.roomId;
  if (roomId) {
    const room = await db.rooms.get(roomId);
    if (!room || room.branchId !== course.branchId) return "room";
  }
  const today = localDayKey();
  const classes = await db.classes.where("courseId").equals(course.id).toArray();
  await db.transaction("rw", [db.courses, db.classes, db.courseTeachers], async () => {
    await db.courses.update(course.id, {
      name: input.name.trim(),
      style: input.style.trim() || input.name.trim(),
      level: input.level,
      description: input.description.trim(),
      teacherId: input.teacherId,
      roomId,
      start: input.start,
      end: input.end,
      active: input.active,
      slot: slotLine(course.weekdays, input.start),
    });
    const mains = await db.courseTeachers.where("courseId").equals(course.id).filter((t) => t.role === "main").toArray();
    if (mains[0]) await db.courseTeachers.update(mains[0].id, { teacherId: input.teacherId });
    else await db.courseTeachers.add({ id: uid("ct"), courseId: course.id, teacherId: input.teacherId, role: "main" });
    for (const klass of classes) {
      if (klass.day < today || klass.status === "cancelled" || klass.status === "completed") continue;
      await db.classes.update(klass.id, {
        teacherId: input.teacherId,
        roomId,
        start: input.start,
        end: input.end,
        name: `${input.name.trim()} · #${klass.index}`,
      });
    }
  });
  return "";
}

export async function updateClass(input: {
  id: string;
  capacity: number;
  teacherId: string;
  roomId?: string;
  start: string;
  end: string;
  day?: string;
  status?: "upcoming" | "ongoing" | "completed" | "cancelled";
}) {
  const klass = await db.classes.get(input.id);
  if (!klass || !input.teacherId || input.capacity < 1) return "fields";
  const roomId = input.roomId ?? klass.roomId;
  if (roomId) {
    const room = await db.rooms.get(roomId);
    if (!room || room.branchId !== klass.branchId) return "room";
  }
  await db.classes.update(klass.id, {
    capacity: input.capacity,
    teacherId: input.teacherId,
    roomId,
    start: input.start,
    end: input.end,
    ...(input.day ? { day: input.day } : {}),
    ...(input.status ? { status: input.status } : {}),
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
    /* room name denormalized field removed — classes store roomId only */
  });
  return "";
}

export async function createTeacher(input: {
  name: string;
  phone: string;
  email?: string;
  branchId: string;
  styles: string[];
  levels: Level[];
  teacherStatus?: TeacherStatus;
  note?: string;
  pin?: string;
}) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name || !phone || !input.branchId) return "fields";
  if (!input.styles.length || !input.levels.length) return "skills";
  const id = uid("u");
  const count = await db.users.where("role").equals("teacher").count();
  const pin = input.pin?.trim();
  if (pin && !/^\d{4}$/.test(pin)) return "pin";
  await db.users.add({
    id,
    name,
    phone,
    email: (input.email ?? "").trim() || `${id}@demo.local`,
    role: "teacher",
    pin: pin || `locked-${id}`,
    avatarColor: TEACHER_COLORS[count % TEACHER_COLORS.length],
    branchId: input.branchId,
    styles: input.styles,
    levels: input.levels,
    teacherStatus: input.teacherStatus ?? "active",
    note: (input.note ?? "").trim(),
  });
  return id;
}

export async function updateTeacher(input: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  branchId: string;
  styles: string[];
  levels: Level[];
  teacherStatus: TeacherStatus;
  note?: string;
  pin?: string;
}) {
  const user = await db.users.get(input.id);
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!user || user.role !== "teacher" || !name || !phone || !input.branchId) return "fields";
  if (!input.styles.length || !input.levels.length) return "skills";
  const patch: Partial<User> = {
    name,
    phone,
    email: (input.email ?? "").trim() || user.email,
    branchId: input.branchId,
    styles: input.styles,
    levels: input.levels,
    teacherStatus: input.teacherStatus,
    note: (input.note ?? "").trim(),
  };
  const pin = input.pin?.trim();
  if (pin) {
    if (!/^\d{4}$/.test(pin)) return "pin";
    patch.pin = pin;
  }
  await db.users.update(user.id, patch);
  return "";
}

export async function markTeacherAbsence(input: { teacherId: string; day: string; note?: string }) {
  const teacher = await db.users.get(input.teacherId);
  if (!teacher || teacher.role !== "teacher" || !input.day) return "fields";
  const existing = await db.teacherAbsences
    .where("teacherId")
    .equals(input.teacherId)
    .filter((a) => a.day === input.day)
    .first();
  if (existing) {
    await db.teacherAbsences.update(existing.id, { note: (input.note ?? "").trim() });
    return "";
  }
  await db.teacherAbsences.add({
    id: uid("ta"),
    teacherId: input.teacherId,
    day: input.day,
    note: (input.note ?? "").trim(),
  });
  return "";
}

export async function clearTeacherAbsence(id: string) {
  await db.teacherAbsences.delete(id);
  return "";
}

/** Suggest active teachers sharing at least one style or level. */
export function suggestBackupTeachers(
  absent: User,
  allTeachers: User[],
  excludeId: string,
): User[] {
  const styles = new Set(absent.styles ?? []);
  const levels = new Set(absent.levels ?? []);
  return allTeachers
    .filter((t) => {
      if (t.id === excludeId || t.role !== "teacher") return false;
      if ((t.teacherStatus ?? "active") !== "active") return false;
      const shareStyle = (t.styles ?? []).some((s) => styles.has(s));
      const shareLevel = (t.levels ?? []).some((l) => levels.has(l));
      return shareStyle || shareLevel;
    })
    .sort((a, b) => {
      const score = (u: User) =>
        (u.styles ?? []).filter((s) => styles.has(s)).length * 2 +
        (u.levels ?? []).filter((l) => levels.has(l)).length;
      return score(b) - score(a);
    });
}
