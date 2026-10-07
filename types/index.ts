export type VerticalId = "nhay";

export type Role = "owner" | "reception" | "teacher";

export type LeadStage = "new" | "contacted" | "trial" | "won" | "lost";

export type StudentStatus = "active" | "trial" | "paused";

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
};

export type StudentNote = {
  day: string;
  text: string;
};

export type Student = {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
  status: StudentStatus;
  packageId: string;
  classId: string;
  remainingSessions: number;
  debt: number;
  parentName: string;
  parentPhone: string;
  joinedDay: string;
  notes: StudentNote[];
};

export type DanceClass = {
  id: string;
  name: string;
  teacherId: string;
  room: string;
  capacity: number;
  level: string;
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
};

export type CoursePackage = {
  id: string;
  name: string;
  sessions: number;
  price: number;
  note: string;
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
  amount: number;
  method: PayMethod;
  day: string;
  note: string;
};

export type Receivable = {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  paid: number;
  dueDay: string;
};

export type StudioTask = {
  id: string;
  title: string;
  done: boolean;
  day: string;
};

export type Meta = {
  key: string;
  value: string;
};
