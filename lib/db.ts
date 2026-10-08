import Dexie, { type EntityTable } from "dexie";
import type {
  Attendance,
  Branch,
  ClassStudent,
  Course,
  CourseRoom,
  CourseTeacher,
  Hold,
  Installment,
  Lead,
  Meta,
  Payment,
  Promotion,
  Room,
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
import {
  dbNameForVertical,
  getStoredVertical,
  type VerticalId,
} from "@/lib/vertical";

export class DolphinCrmDB extends Dexie {
  settings!: EntityTable<StudioSettings, "id">;
  users!: EntityTable<User, "id">;
  leads!: EntityTable<Lead, "id">;
  students!: EntityTable<Student, "id">;
  classes!: EntityTable<StudioClass, "id">;
  classStudents!: EntityTable<ClassStudent, "id">;
  attendance!: EntityTable<Attendance, "id">;
  subscriptionPlans!: EntityTable<SubscriptionPlan, "id">;
  subscriptions!: EntityTable<Subscription, "id">;
  installments!: EntityTable<Installment, "id">;
  payments!: EntityTable<Payment, "id">;
  tasks!: EntityTable<StudioTask, "id">;
  taskParents!: EntityTable<TaskParent, "id">;
  courses!: EntityTable<Course, "id">;
  courseTeachers!: EntityTable<CourseTeacher, "id">;
  courseRooms!: EntityTable<CourseRoom, "id">;
  rooms!: EntityTable<Room, "id">;
  promotions!: EntityTable<Promotion, "id">;
  holds!: EntityTable<Hold, "id">;
  bookings!: EntityTable<RoomBooking, "id">;
  branches!: EntityTable<Branch, "id">;
  teacherAbsences!: EntityTable<TeacherAbsence, "id">;
  meta!: EntityTable<Meta, "key">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      settings: "id",
      users: "id, role, pin",
      leads: "id, stage, day",
      students: "id, classId, status, name",
      classes: "id, weekday, teacherId",
      attendance: "id, classId, studentId, day",
      packages: "id",
      enrollments: "id, studentId, classId",
      payments: "id, studentId, day",
      receivables: "id, studentId, dueDay",
      tasks: "id, day",
      meta: "key",
    });
    this.version(2).stores({
      courses: "id",
      rooms: "id",
      promotions: "id",
      holds: "id, studentId",
      bookings: "id, roomId, day",
    });
    this.version(3).stores({
      branches: "id",
      sessions: "id, courseId, classId, day, branchId, teacherId",
      audits: "id, sessionId",
    });
    this.version(4).stores({
      tasks: "id, dueDay, status, assigneeId",
    });
    this.version(5).stores({
      taskParents: "id",
      tasks: "id, dueDay, status, assigneeId, parentId",
    });
    this.version(6).stores({
      teacherAbsences: "id, teacherId, day",
      users: "id, role, pin, branchId, teacherStatus",
    });
    this.version(7).stores({
      settings: "id",
      users: "id, role, pin, branchId, teacherStatus",
      leads: "id, stage, day",
      students: "id, courseId, subscriptionId, status, name",
      classes: "id, courseId, day, branchId, teacherId, status",
      classStudents: "id, classId, studentId",
      attendance: "id, classId, personId, day, subject",
      subscriptionPlans: "id",
      subscriptions: "id, studentId, courseId, planId, status",
      installments: "id, subscriptionId, studentId, dueDay",
      payments: "id, studentId, subscriptionId, day",
      tasks: "id, dueDay, status, assigneeId, parentId",
      taskParents: "id",
      courses: "id, branchId",
      courseTeachers: "id, courseId, teacherId",
      courseRooms: "id, courseId, roomId",
      rooms: "id, branchId",
      promotions: "id",
      holds: "id, studentId",
      bookings: "id, roomId, day",
      branches: "id",
      teacherAbsences: "id, teacherId, day",
      meta: "key",
      // drop legacy
      sessions: null,
      audits: null,
      packages: null,
      enrollments: null,
      receivables: null,
    });
  }
}

function createDb(id: VerticalId) {
  return new DolphinCrmDB(dbNameForVertical(id));
}

export let db: DolphinCrmDB = createDb(getStoredVertical() ?? "nhay");

export function reopenDb(id: VerticalId) {
  const name = dbNameForVertical(id);
  if (db.name === name) {
    if (!db.isOpen()) void db.open();
    return db;
  }
  if (db.isOpen()) db.close();
  db = createDb(id);
  return db;
}
