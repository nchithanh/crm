import { db } from "@/lib/db";
import { canJoinAtSession, deductsCredit } from "@/lib/rules";
import { localDayKey, uid } from "@/lib/utils";
import type { AttendStatus, LeadStage, PayMethod, Role } from "@/types";

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
    activities: [{ day, text: "Tạo lead tại quầy." }],
  });
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

export async function toggleTask(id: string, done: boolean) {
  await db.tasks.update(id, { done });
}

export async function payReceivable(input: {
  receivableId: string;
  amount: number;
  method: PayMethod;
  billNote?: string;
}) {
  const row = await db.receivables.get(input.receivableId);
  if (!row) return;
  const room = Math.max(0, row.amount - row.paid);
  const amount = Math.min(room, Math.max(0, Math.round(input.amount)));
  if (amount <= 0) return;
  const student = await db.students.get(row.studentId);
  await db.transaction("rw", [db.receivables, db.payments, db.students], async () => {
    await db.receivables.update(row.id, { paid: row.paid + amount });
    await db.payments.add({
      id: uid("pay"),
      studentId: row.studentId,
      branchId: row.branchId || student?.branchId || "",
      amount,
      method: input.method,
      day: localDayKey(),
      note: `Thu ${row.title}`,
      billNote: input.billNote?.trim() ?? "",
    });
    if (student) {
      await db.students.update(student.id, {
        debt: Math.max(0, student.debt - amount),
      });
    }
  });
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

export async function decideHold(id: string, status: "approved" | "rejected", role: Role) {
  if (role !== "owner") return "Chỉ Quản lý duyệt bảo lưu.";
  const hold = await db.holds.get(id);
  if (!hold || hold.status !== "pending") return "Phiếu không còn chờ duyệt.";
  if (status === "approved" && hold.needsPackage) {
    const bought = await db.enrollments
      .filter((e) => e.studentId === hold.studentId && e.packageId === "phold")
      .first();
    if (!bought) return "Gói dưới 3 tháng phải mua gói bảo lưu trước khi duyệt.";
  }
  await db.holds.update(id, { status: status === "approved" ? "approved" : "rejected" });
  return "";
}

export async function updateSession(input: {
  sessionId: string;
  actorId: string;
  teacherId?: string;
  roomId?: string;
}) {
  const session = await db.sessions.get(input.sessionId);
  if (!session) return;
  const bits: string[] = [];
  const patch: Partial<typeof session> = {};
  if (input.teacherId && input.teacherId !== session.teacherId) {
    patch.teacherId = input.teacherId;
    bits.push("đổi giáo viên");
  }
  if (input.roomId && input.roomId !== session.roomId) {
    patch.roomId = input.roomId;
    bits.push("đổi phòng");
  }
  if (bits.length === 0) return;
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
