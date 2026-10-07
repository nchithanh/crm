import { db } from "@/lib/db";
import { localDayKey, uid } from "@/lib/utils";
import type { AttendStatus, LeadStage, PayMethod } from "@/types";

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
}) {
  const id = `${input.classId}_${input.studentId}_${input.day}`;
  const prev = await db.attendance.get(id);
  const student = await db.students.get(input.studentId);
  if (!student) return;
  let remaining = student.remainingSessions;
  const wasPresent = prev?.status === "present";
  const nowPresent = input.status === "present";
  if (!wasPresent && nowPresent) remaining = Math.max(0, remaining - 1);
  if (wasPresent && !nowPresent) remaining += 1;
  await db.transaction("rw", [db.attendance, db.students], async () => {
    await db.attendance.put({ id, ...input });
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
      amount,
      method: input.method,
      day: localDayKey(),
      note: `Thu ${row.title}`,
    });
    if (student) {
      await db.students.update(student.id, {
        debt: Math.max(0, student.debt - amount),
      });
    }
  });
}

export async function enrollStudent(input: {
  studentId: string;
  packageId: string;
  classId: string;
}) {
  const pack = await db.packages.get(input.packageId);
  const student = await db.students.get(input.studentId);
  if (!pack || !student) return;
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
      remainingSessions: student.remainingSessions + pack.sessions,
      debt: student.debt + pack.price,
      status: student.status === "paused" ? "active" : student.status,
    });
    await db.receivables.add({
      id: uid("debt"),
      studentId: student.id,
      title: pack.name,
      amount: pack.price,
      paid: 0,
      dueDay: day,
    });
  });
}
