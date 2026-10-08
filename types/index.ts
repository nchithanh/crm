export type VerticalId = "nhay";

export type Role = "owner" | "reception" | "teacher";

export type LeadStage = "new" | "contacted" | "trial" | "won" | "lost";

export type StudentStatus = "active" | "trial" | "paused";

export type Level = "begin" | "inter" | "advance";

export type SessionStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export type AttendStatus = "present" | "absent" | "excused";

export type PayMethod = "cash" | "transfer";

export type DebtStatus = "unpaid" | "partial" | "paid" | "overdue";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  pin: string;
  avatarColor: string;
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
  packageId: string;
  classId: string;
  courseId: string;
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

export type Course = {
  id: string;
  name: string;
  style: string;
  level: Level;
  slot: string;
  teacherId: string;
  branchId: string;
  roomId: string;
  classId: string;
  startDay: string;
  endDay: string;
  weekdays: number[];
  start: string;
  end: string;
  description: string;
  active: boolean;
};

export type Room = {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  floor: string;
  note: string;
};

export type ClassSession = {
  id: string;
  courseId: string;
  classId: string;
  branchId: string;
  index: number;
  day: string;
  start: string;
  end: string;
  teacherId: string;
  roomId: string;
  status: SessionStatus;
  note: string;
};

export type SessionAudit = {
  id: string;
  sessionId: string;
  day: string;
  actorId: string;
  text: string;
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

export type DanceClass = {
  id: string;
  name: string;
  courseId: string;
  branchId: string;
  teacherId: string;
  roomId: string;
  room: string;
  capacity: number;
  level: Level;
  /** 0 = Chủ nhật … 6 = Thứ bảy */
  weekday: number;
  start: string;
  end: string;
  active: boolean;
};

export type Attendance = {
  id: string;
  classId: string;
  studentId: string;
  day: string;
  status: AttendStatus;
  sessionId: string;
  waived: boolean;
};

export type CoursePackage = {
  id: string;
  name: string;
  sessions: number;
  months: number;
  price: number;
  note: string;
  kind: "course" | "hold";
  deposit: number;
};

export type Enrollment = {
  id: string;
  studentId: string;
  packageId: string;
  classId: string;
  day: string;
  sessions: number;
};

export type Payment = {
  id: string;
  studentId: string;
  branchId: string;
  amount: number;
  method: PayMethod;
  day: string;
  note: string;
  billNote: string;
  billImage?: string;
};

export type Receivable = {
  id: string;
  studentId: string;
  branchId: string;
  title: string;
  amount: number;
  paid: number;
  dueDay: string;
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
