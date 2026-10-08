import { db } from "@/lib/db";
import { loadSeed } from "@/lib/seed-data";
import { classStatus, sessionDates } from "@/lib/schedule";
import { dayFromOffset, localDayKey } from "@/lib/utils";
import type { VerticalId } from "@/lib/vertical";
import type {
  Attendance,
  ClassStudent,
  Course,
  CourseRoom,
  CourseTeacher,
  Hold,
  Installment,
  Lead,
  Payment,
  Promotion,
  RoomBooking,
  Student,
  StudioClass,
  StudioSettings,
  StudioTask,
  Subscription,
  SubscriptionPlan,
  TaskParent,
  TeacherAbsence,
  User,
} from "@/types";

const SEED_KEY = "seedVersion";
const SEED_VERSION = "14b";

function birthFromYears(years: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  return localDayKey(d);
}

function addMonths(day: string, months: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1 + months, d ?? 1, 12);
  return localDayKey(dt);
}

export async function ensureSeed(id: VerticalId) {
  const current = await db.meta.get(SEED_KEY);
  if (current?.value === SEED_VERSION) return;
  const raw = loadSeed(id);

  const courseRows: Course[] = [];
  const classRows: StudioClass[] = [];
  for (const rawCourse of raw.courses as {
    id: string;
    name: string;
    style: string;
    level: Course["level"];
    slot: string;
    teacherId: string;
    branchId: string;
    roomId?: string;
    startOffset: number;
    weekdays: number[];
    start: string;
    end: string;
    cancelIndex?: number;
    description: string;
    active: boolean;
    sessionCount?: number;
    durationMonths?: number;
    capacity?: number;
  }[]) {
    const startDay = dayFromOffset(rawCourse.startOffset);
    const count = rawCourse.sessionCount ?? 8;
    const capacity = Math.max(1, rawCourse.capacity ?? 12);
    const days = sessionDates(startDay, rawCourse.weekdays, count);
    const endDay = days[days.length - 1] ?? startDay;
    courseRows.push({
      id: rawCourse.id,
      name: rawCourse.name,
      style: rawCourse.style,
      level: rawCourse.level,
      slot: rawCourse.slot,
      teacherId: rawCourse.teacherId,
      branchId: rawCourse.branchId,
      roomId: rawCourse.roomId ?? "",
      startDay,
      endDay,
      weekdays: rawCourse.weekdays,
      start: rawCourse.start,
      end: rawCourse.end,
      sessionCount: count,
      capacity,
      durationMonths: rawCourse.durationMonths ?? 1,
      description: rawCourse.description,
      active: rawCourse.active,
    });
    days.forEach((day, i) => {
      const index = i + 1;
      classRows.push({
        id: `${rawCourse.id}-c${index}`,
        courseId: rawCourse.id,
        branchId: rawCourse.branchId,
        index,
        name: `${rawCourse.name} · #${index}`,
        day,
        start: rawCourse.start,
        end: rawCourse.end,
        teacherId: rawCourse.teacherId,
        roomId: rawCourse.roomId ?? "",
        status: classStatus(day, index, rawCourse.cancelIndex),
        capacity,
        note: rawCourse.cancelIndex === index ? "Nghỉ lễ" : "",
      });
    });
  }

  const courseTeachers = raw.courseTeachers as CourseTeacher[];
  const courseRooms = raw.courseRooms as CourseRoom[];

  const studentRows: Student[] = (raw.students as {
    id: string;
    name: string;
    phone: string;
    email: string;
    birthYears: number;
    avatarColor: string;
    status: Student["status"];
    subscriptionId: string;
    courseId: string;
    branchId: string;
    level: Student["level"];
    remainingSessions: number;
    debt: number;
    parentName: string;
    parentPhone: string;
    flagged?: boolean;
    joinedOffset: number;
    notes: { offset: number; text: string }[];
  }[]).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    birthDay: birthFromYears(s.birthYears),
    avatarColor: s.avatarColor,
    status: s.status,
    subscriptionId: s.subscriptionId,
    courseId: s.courseId,
    branchId: s.branchId,
    level: s.level,
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

  const subscriptionRows: Subscription[] = (raw.subscriptions as {
    id: string;
    studentId: string;
    courseId: string;
    planId: string;
    offset: number;
    sessions: number;
    remainingSessions: number;
    status: Subscription["status"];
    months?: number;
  }[]).map((s) => {
    const day = dayFromOffset(s.offset);
    return {
      id: s.id,
      studentId: s.studentId,
      courseId: s.courseId,
      planId: s.planId,
      day,
      endDay: addMonths(day, s.months ?? 1),
      sessions: s.sessions,
      remainingSessions: s.remainingSessions,
      status: s.status,
    };
  });

  const paymentRows: Payment[] = (raw.payments as {
    id: string;
    studentId: string;
    subscriptionId?: string;
    installmentId?: string;
    branchId: string;
    amount: number;
    method: Payment["method"];
    offset: number;
    note: string;
    billNote: string;
  }[]).map((p) => ({
    id: p.id,
    studentId: p.studentId,
    subscriptionId: p.subscriptionId ?? "",
    installmentId: p.installmentId ?? "",
    branchId: p.branchId,
    amount: p.amount,
    method: p.method,
    day: dayFromOffset(p.offset),
    note: p.note,
    billNote: p.billNote,
  }));

  const installmentRows: Installment[] = (raw.installments as {
    id: string;
    subscriptionId: string;
    studentId: string;
    branchId: string;
    title: string;
    amount: number;
    paid: number;
    dueOffset: number;
  }[]).map((r) => ({
    id: r.id,
    subscriptionId: r.subscriptionId,
    studentId: r.studentId,
    branchId: r.branchId,
    title: r.title,
    amount: r.amount,
    paid: r.paid,
    dueDay: dayFromOffset(r.dueOffset),
  }));

  const taskRows: StudioTask[] = raw.tasks.map((t) => {
    const row = t as {
      id: string;
      title: string;
      offset: number;
      status?: string;
      priority?: StudioTask["priority"];
      assigneeId?: string;
      branchId?: string;
      parentId?: string;
      note?: string;
      done?: boolean;
      comments?: { id: string; actorId: string; offset: number; text: string }[];
    };
    const rawStatus = row.status === "doing" ? "inprogress" : row.status;
    const status: StudioTask["status"] =
      rawStatus === "todo" ||
      rawStatus === "inprogress" ||
      rawStatus === "verify" ||
      rawStatus === "feedback" ||
      rawStatus === "done"
        ? rawStatus
        : row.done
          ? "done"
          : "todo";
    return {
      id: row.id,
      title: row.title,
      status,
      priority: row.priority ?? "medium",
      assigneeId: row.assigneeId ?? "",
      branchId: row.branchId ?? "",
      parentId: row.parentId ?? "",
      dueDay: dayFromOffset(row.offset),
      note: row.note ?? "",
      comments: (row.comments ?? []).map((c) => ({
        id: c.id,
        actorId: c.actorId,
        day: dayFromOffset(c.offset),
        text: c.text,
      })),
    };
  });
  const taskParentRows = (raw.taskParents ?? []) as TaskParent[];
  const teacherAbsenceRows: TeacherAbsence[] = ((raw.teacherAbsences ?? []) as { id: string; teacherId: string; offset: number; note?: string }[]).map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    day: dayFromOffset(row.offset),
    note: row.note ?? "",
  }));

  const legacyMap = raw.legacyClassMap ?? {};
  const attendanceRows: Attendance[] = [];
  const attendanceUsed = new Set<string>();
  for (const a of raw.attendance as {
    legacyClassId: string;
    personId: string;
    subject: Attendance["subject"];
    offset: number;
    status: Attendance["status"];
    waived: boolean;
  }[]) {
    const day = dayFromOffset(a.offset);
    const courseId = legacyMap[a.legacyClassId];
    if (!courseId) continue;
    const dayMs = Date.parse(`${day}T12:00:00`);
    const candidates = classRows
      .filter((c) => c.courseId === courseId && c.status !== "cancelled")
      .slice()
      .sort((x, y) => Math.abs(Date.parse(`${x.day}T12:00:00`) - dayMs) - Math.abs(Date.parse(`${y.day}T12:00:00`) - dayMs) || x.index - y.index);
    // Prefer exact/nearest day; skip classes already used for this person (avoid bulkAdd key clash).
    const klass = candidates.find((c) => !attendanceUsed.has(`${c.id}_${a.subject}_${a.personId}`));
    if (!klass) continue;
    const id = `${klass.id}_${a.subject}_${a.personId}`;
    attendanceUsed.add(id);
    attendanceRows.push({
      id,
      classId: klass.id,
      personId: a.personId,
      subject: a.subject,
      day: klass.day,
      status: a.status,
      waived: a.waived,
    });
  }

  const classStudentRows: ClassStudent[] = [];
  for (const st of studentRows) {
    if (st.status === "paused") continue;
    for (const klass of classRows.filter((c) => c.courseId === st.courseId && c.status !== "cancelled")) {
      classStudentRows.push({
        id: `${klass.id}_${st.id}`,
        classId: klass.id,
        studentId: st.id,
      });
    }
  }

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

  await db.transaction(
    "rw",
    [
      db.settings,
      db.users,
      db.subscriptionPlans,
      db.classes,
      db.classStudents,
      db.students,
      db.leads,
      db.subscriptions,
      db.payments,
      db.installments,
      db.tasks,
      db.taskParents,
      db.attendance,
      db.courses,
      db.courseTeachers,
      db.courseRooms,
      db.rooms,
      db.promotions,
      db.holds,
      db.bookings,
      db.branches,
      db.teacherAbsences,
      db.meta,
    ],
    async () => {
      await db.settings.clear();
      await db.users.clear();
      await db.subscriptionPlans.clear();
      await db.classes.clear();
      await db.classStudents.clear();
      await db.students.clear();
      await db.leads.clear();
      await db.subscriptions.clear();
      await db.payments.clear();
      await db.installments.clear();
      await db.tasks.clear();
      await db.taskParents.clear();
      await db.attendance.clear();
      await db.courses.clear();
      await db.courseTeachers.clear();
      await db.courseRooms.clear();
      await db.rooms.clear();
      await db.promotions.clear();
      await db.holds.clear();
      await db.bookings.clear();
      await db.branches.clear();
      await db.teacherAbsences.clear();

      await db.settings.add(raw.settings as StudioSettings);
      await db.users.bulkAdd(raw.users as User[]);
      await db.subscriptionPlans.bulkAdd(raw.subscriptionPlans as SubscriptionPlan[]);
      await db.courses.bulkAdd(courseRows);
      await db.courseTeachers.bulkAdd(courseTeachers);
      await db.courseRooms.bulkAdd(courseRooms);
      await db.classes.bulkAdd(classRows);
      await db.classStudents.bulkAdd(classStudentRows);
      await db.branches.bulkAdd(raw.branches);
      await db.students.bulkAdd(studentRows);
      await db.leads.bulkAdd(leadRows);
      await db.subscriptions.bulkAdd(subscriptionRows);
      await db.payments.bulkAdd(paymentRows);
      await db.installments.bulkAdd(installmentRows);
      await db.tasks.bulkAdd(taskRows);
      await db.taskParents.bulkAdd(taskParentRows);
      await db.attendance.bulkAdd(attendanceRows);
      await db.rooms.bulkAdd(raw.rooms);
      await db.promotions.bulkAdd(promotionRows);
      await db.holds.bulkAdd(holdRows);
      await db.bookings.bulkAdd(bookingRows);
      await db.teacherAbsences.bulkAdd(teacherAbsenceRows);
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
    },
  );
}
