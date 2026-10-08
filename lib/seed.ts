import { db } from "@/lib/db";
import { loadSeed } from "@/lib/seed-data";
import { sessionDates, sessionStatus } from "@/lib/schedule";
import { dayFromOffset, localDayKey } from "@/lib/utils";
import type { VerticalId } from "@/lib/vertical";
import type {
  Attendance,
  ClassSession,
  Course,
  CoursePackage,
  DanceClass,
  Enrollment,
  Hold,
  Lead,
  Payment,
  Promotion,
  Receivable,
  RoomBooking,
  Student,
  StudioSettings,
  StudioTask,
  User,
} from "@/types";

const SEED_KEY = "seedVersion";
const SEED_VERSION = "7";

function birthFromYears(years: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  return localDayKey(d);
}

export async function ensureSeed(id: VerticalId) {
  const current = await db.meta.get(SEED_KEY);
  if (current?.value === SEED_VERSION) return;
  const raw = loadSeed(id);

  const studentRows: Student[] = raw.students.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    birthDay: birthFromYears(s.birthYears),
    avatarColor: s.avatarColor,
    status: s.status as Student["status"],
    packageId: s.packageId,
    classId: s.classId,
    courseId: s.courseId,
    branchId: s.branchId,
    level: s.level as Student["level"],
    remainingSessions: s.remainingSessions,
    debt: s.debt,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    flagged: Boolean(s.flagged),
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
      branchId: p.branchId,
      amount: p.amount,
      method: p.method as Payment["method"],
      day: dayFromOffset(p.offset),
      note: p.note,
      billNote: p.billNote,
  }));

  const receivableRows: Receivable[] = raw.receivables.map((r) => ({
    id: r.id,
      studentId: r.studentId,
      branchId: r.branchId,
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
      sessionId: a.sessionId,
      waived: a.waived,
    };
  });

  const holdRows: Hold[] = raw.holds.map((h) => ({
    id: h.id,
    studentId: h.studentId,
    fromDay: dayFromOffset(h.fromOffset),
    toDay: dayFromOffset(h.toOffset),
    reason: h.reason,
    status: h.status as Hold["status"],
    credits: h.credits,
    needsPackage: h.needsPackage,
  }));

  const bookingRows: RoomBooking[] = raw.bookings.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    renter: b.renter,
    phone: b.phone,
    day: dayFromOffset(b.offset),
    start: b.start,
    end: b.end,
    fee: b.fee,
    status: b.status as RoomBooking["status"],
  }));

  const promotionRows: Promotion[] = raw.promotions.map((p) => ({
    id: p.id,
    name: p.name,
    discountLabel: p.discountLabel,
    startDay: dayFromOffset(p.startOffset),
    endDay: dayFromOffset(p.endOffset),
    active: p.active,
    note: p.note,
  }));

  const courseRows: Course[] = [];
  const sessionRows: ClassSession[] = [];
  for (const rawCourse of raw.courses) {
    const startDay = dayFromOffset(rawCourse.startOffset);
    const days = sessionDates(startDay, rawCourse.weekdays, 8);
    const endDay = days[days.length - 1] ?? startDay;
    courseRows.push({
      id: rawCourse.id,
      name: rawCourse.name,
      style: rawCourse.style,
      level: rawCourse.level as Course["level"],
      slot: rawCourse.slot,
      teacherId: rawCourse.teacherId,
      branchId: rawCourse.branchId,
      roomId: rawCourse.roomId,
      classId: rawCourse.classId,
      startDay,
      endDay,
      weekdays: rawCourse.weekdays,
      start: rawCourse.start,
      end: rawCourse.end,
      description: rawCourse.description,
      active: rawCourse.active,
    });
    days.forEach((day, i) => {
      const index = i + 1;
      sessionRows.push({
        id: `${rawCourse.id}-s${index}`,
        courseId: rawCourse.id,
        classId: rawCourse.classId,
        branchId: rawCourse.branchId,
        index,
        day,
        start: rawCourse.start,
        end: rawCourse.end,
        teacherId: rawCourse.teacherId,
        roomId: rawCourse.roomId,
        status: sessionStatus(day, index, rawCourse.cancelIndex),
        note: rawCourse.cancelIndex === index ? "Nghỉ lễ" : "",
      });
    });
  }

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
      db.courses,
      db.rooms,
      db.promotions,
      db.holds,
      db.bookings,
      db.branches,
      db.sessions,
      db.audits,
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
      await db.courses.clear();
      await db.rooms.clear();
      await db.promotions.clear();
      await db.holds.clear();
      await db.bookings.clear();
      await db.branches.clear();
      await db.sessions.clear();
      await db.audits.clear();
      await db.settings.add(raw.settings as StudioSettings);
      await db.users.bulkAdd(raw.users as User[]);
      await db.packages.bulkAdd(raw.packages as CoursePackage[]);
      await db.classes.bulkAdd(raw.classes as DanceClass[]);
      await db.courses.bulkAdd(courseRows);
      await db.sessions.bulkAdd(sessionRows);
      await db.branches.bulkAdd(raw.branches);
      await db.students.bulkAdd(studentRows);
      await db.leads.bulkAdd(leadRows);
      await db.enrollments.bulkAdd(enrollmentRows);
      await db.payments.bulkAdd(paymentRows);
      await db.receivables.bulkAdd(receivableRows);
      await db.tasks.bulkAdd(taskRows);
      await db.attendance.bulkAdd(attendanceRows);
      await db.rooms.bulkAdd(raw.rooms);
      await db.promotions.bulkAdd(promotionRows);
      await db.holds.bulkAdd(holdRows);
      await db.bookings.bulkAdd(bookingRows);
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
    },
  );
}
