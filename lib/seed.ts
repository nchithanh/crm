import settings from "@/data/nhay/settings.json";
import users from "@/data/nhay/users.json";
import packages from "@/data/nhay/packages.json";
import classes from "@/data/nhay/classes.json";
import students from "@/data/nhay/students.json";
import leads from "@/data/nhay/leads.json";
import enrollments from "@/data/nhay/enrollments.json";
import payments from "@/data/nhay/payments.json";
import receivables from "@/data/nhay/receivables.json";
import tasks from "@/data/nhay/tasks.json";
import attendance from "@/data/nhay/attendance.json";
import { db } from "@/lib/db";
import { dayFromOffset } from "@/lib/utils";
import type { VerticalId } from "@/lib/vertical";
import type {
  Attendance,
  CoursePackage,
  DanceClass,
  Enrollment,
  Lead,
  Payment,
  Receivable,
  Student,
  StudioSettings,
  StudioTask,
  User,
} from "@/types";

const SEED_KEY = "seedVersion";
const SEED_VERSION = "1";

/**
 * Bundle JSON theo lĩnh vực. Thêm ngành = thêm folder `data/{id}` và một nhánh ở đây.
 */
function bundle(id: VerticalId) {
  if (id !== "nhay") {
    throw new Error(`Chưa có JSON cho lĩnh vực ${id}`);
  }
  return {
    settings,
    users,
    packages,
    classes,
    students,
    leads,
    enrollments,
    payments,
    receivables,
    tasks,
    attendance,
  };
}

export async function ensureSeed(id: VerticalId) {
  const current = await db.meta.get(SEED_KEY);
  if (current?.value === SEED_VERSION) return;
  const raw = bundle(id);

  const studentRows: Student[] = raw.students.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    avatarColor: s.avatarColor,
    status: s.status as Student["status"],
    packageId: s.packageId,
    classId: s.classId,
    remainingSessions: s.remainingSessions,
    debt: s.debt,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    joinedDay: dayFromOffset(s.joinedOffset),
    notes: s.notes.map((n) => ({ day: dayFromOffset(n.offset), text: n.text })),
  }));

  const leadRows: Lead[] = raw.leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    source: l.source,
    stage: l.stage as Lead["stage"],
    interest: l.interest,
    ownerId: l.ownerId,
    day: dayFromOffset(l.offset),
    note: l.note,
    activities: l.activities.map((a) => ({
      day: dayFromOffset(a.offset),
      text: a.text,
    })),
  }));

  const enrollmentRows: Enrollment[] = raw.enrollments.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    packageId: e.packageId,
    classId: e.classId,
    day: dayFromOffset(e.offset),
    sessions: e.sessions,
  }));

  const paymentRows: Payment[] = raw.payments.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    amount: p.amount,
    method: p.method as Payment["method"],
    day: dayFromOffset(p.offset),
    note: p.note,
  }));

  const receivableRows: Receivable[] = raw.receivables.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    title: r.title,
    amount: r.amount,
    paid: r.paid,
    dueDay: dayFromOffset(r.dueOffset),
  }));

  const taskRows: StudioTask[] = raw.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.done,
    day: dayFromOffset(t.offset),
  }));

  const attendanceRows: Attendance[] = raw.attendance.map((a) => {
    const day = dayFromOffset(a.offset);
    return {
      id: `${a.classId}_${a.studentId}_${day}`,
      classId: a.classId,
      studentId: a.studentId,
      day,
      status: a.status as Attendance["status"],
    };
  });

  await db.transaction(
    "rw",
    [
      db.settings,
      db.users,
      db.packages,
      db.classes,
      db.students,
      db.leads,
      db.enrollments,
      db.payments,
      db.receivables,
      db.tasks,
      db.attendance,
      db.meta,
    ],
    async () => {
      await db.settings.clear();
      await db.users.clear();
      await db.packages.clear();
      await db.classes.clear();
      await db.students.clear();
      await db.leads.clear();
      await db.enrollments.clear();
      await db.payments.clear();
      await db.receivables.clear();
      await db.tasks.clear();
      await db.attendance.clear();
      await db.settings.add(raw.settings as StudioSettings);
      await db.users.bulkAdd(raw.users as User[]);
      await db.packages.bulkAdd(raw.packages as CoursePackage[]);
      await db.classes.bulkAdd(raw.classes as DanceClass[]);
      await db.students.bulkAdd(studentRows);
      await db.leads.bulkAdd(leadRows);
      await db.enrollments.bulkAdd(enrollmentRows);
      await db.payments.bulkAdd(paymentRows);
      await db.receivables.bulkAdd(receivableRows);
      await db.tasks.bulkAdd(taskRows);
      await db.attendance.bulkAdd(attendanceRows);
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
    },
  );
}
