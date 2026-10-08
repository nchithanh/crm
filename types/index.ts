export type VerticalId = "nhay";

export type Role = "owner" | "reception" | "teacher";

export type LeadStage = "new" | "contacted" | "trial" | "won" | "lost";

export type StudentStatus = "active" | "trial" | "paused";

export type Level = "begin" | "inter" | "advance";

export type TeacherStatus = "active" | "paused" | "left";

export type TeacherRole = "main" | "assistant";

/** Status of one class buổi */
export type ClassStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export type AttendStatus = "present" | "absent" | "excused";

export type AttendSubject = "student" | "teacher";

export type PayMethod = "cash" | "transfer";

export type DebtStatus = "unpaid" | "partial" | "paid" | "overdue";

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  pin: string;
  avatarColor: string;
  branchId?: string;
  styles?: string[];
  levels?: Level[];
  teacherStatus?: TeacherStatus;
  note?: string;
};

export type TeacherAbsence = {
  id: string;
  teacherId: string;
  day: string;
  note: string;
};

export type StudioSettings = {
  id: string;
  name: string;
  vertical: VerticalId;
  address: string;
  phone: string;
};

export type Activity = {
  day: string;
  text: string;
  kind?: "call" | "zalo" | "note";
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  stage: LeadStage;
  interest: string;
  ownerId: string;
  day: string;
  note: string;
  activities: Activity[];
  nextAction?: string;
  reminderDay?: string;
  convertedStudentId?: string;
};

export type StudentNote = {
  day: string;
  text: string;
};

export type Student = {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDay: string;
  avatarColor: string;
  status: StudentStatus;
  /** Active subscription id */
  subscriptionId: string;
  courseId: string;
  /** @deprecated roster via classStudents */
  classId?: string;
  /** @deprecated use subscriptionId / plan */
  packageId?: string;
  branchId: string;
  level: Level;
  remainingSessions: number;
  debt: number;
  parentName: string;
  parentPhone: string;
  flagged: boolean;
  joinedDay: string;
  notes: StudentNote[];
};

export type Branch = {
  id: string;
  name: string;
  address: string;
};

/** Course = khung khóa + lịch mẫu. Room optional. */
export type Course = {
  id: string;
  name: string;
  style: string;
  level: Level;
  slot: string;
  branchId: string;
  /** Default main teacher when generating classes */
  teacherId: string;
  /** Default room for generated classes — may be empty */
  roomId: string;
  startDay: string;
  endDay: string;
  weekdays: number[];
  start: string;
  end: string;
  /** How many buổi to generate from template */
  sessionCount: number;
  /** Max students (sĩ số) — applied to generated classes */
  capacity: number;
  durationMonths: number;
  description: string;
  active: boolean;
  /** @deprecated removed — classes generated as buổi */
  classId?: string;
};

export type CourseTeacher = {
  id: string;
  courseId: string;
  teacherId: string;
  role: TeacherRole;
};

export type CourseRoom = {
  id: string;
  courseId: string;
  roomId: string;
};

export type Room = {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  floor: string;
  note: string;
};

/**
 * Class = one buổi học (materialized from Course).
 * Schedule SoT — there is no Session entity.
 */
export type StudioClass = {
  id: string;
  courseId: string;
  branchId: string;
  /** 1-based index within course */
  index: number;
  name: string;
  day: string;
  start: string;
  end: string;
  teacherId: string;
  roomId: string;
  status: ClassStatus;
  capacity: number;
  note: string;
  /** @deprecated old session.parentClass — use courseId / id */
  classId?: string;
};

export type ClassStudent = {
  id: string;
  classId: string;
  studentId: string;
};

export type Attendance = {
  id: string;
  classId: string;
  /** studentId or teacher userId depending on subject */
  personId: string;
  subject: AttendSubject;
  day: string;
  status: AttendStatus;
  waived: boolean;
  /** @deprecated use personId */
  studentId?: string;
  /** @deprecated */
  sessionId?: string;
};

/** Catalog plan (gói mẫu) */
export type SubscriptionPlan = {
  id: string;
  name: string;
  sessions: number;
  months: number;
  price: number;
  note: string;
  kind: "course" | "hold";
  deposit: number;
};

/** 1 subscription = 1 student on a course */
export type Subscription = {
  id: string;
  studentId: string;
  courseId: string;
  planId: string;
  day: string;
  endDay: string;
  sessions: number;
  remainingSessions: number;
  status: SubscriptionStatus;
  /** @deprecated use planId */
  packageId?: string;
  /** @deprecated */
  classId?: string;
};

export type Installment = {
  id: string;
  subscriptionId: string;
  studentId: string;
  branchId: string;
  title: string;
  amount: number;
  paid: number;
  dueDay: string;
};

export type Payment = {
  id: string;
  studentId: string;
  subscriptionId: string;
  installmentId: string;
  branchId: string;
  amount: number;
  method: PayMethod;
  day: string;
  note: string;
  billNote: string;
  billImage?: string;
};

export type Promotion = {
  id: string;
  name: string;
  discountLabel: string;
  startDay: string;
  endDay: string;
  active: boolean;
  note: string;
};

export type Hold = {
  id: string;
  studentId: string;
  fromDay: string;
  toDay: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "done";
  credits: number;
  needsPackage: boolean;
  approverId?: string;
  rejectReason?: string;
  decidedDay?: string;
};

export type RoomBooking = {
  id: string;
  roomId: string;
  renter: string;
  phone: string;
  day: string;
  start: string;
  end: string;
  fee: number;
  status: "booked" | "done" | "cancelled";
};

export type TaskStatus = "todo" | "inprogress" | "verify" | "feedback" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type TaskComment = {
  id: string;
  day: string;
  actorId: string;
  text: string;
};

export type TaskParent = {
  id: string;
  name: string;
};

export type StudioTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  branchId: string;
  parentId: string;
  dueDay: string;
  note: string;
  comments: TaskComment[];
};

export type Meta = {
  key: string;
  value: string;
};

/** @deprecated aliases during migrate */
export type SessionStatus = ClassStatus;
export type ClassSession = StudioClass;
export type DanceClass = StudioClass;
export type CoursePackage = SubscriptionPlan;
export type Enrollment = Subscription;
export type Receivable = Installment;
