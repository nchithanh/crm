import Dexie, { type EntityTable } from "dexie";
import type {
  Attendance,
  Branch,
  ClassSession,
  Course,
  CoursePackage,
  DanceClass,
  Enrollment,
  Hold,
  Lead,
  Meta,
  Payment,
  Promotion,
  Receivable,
  Room,
  RoomBooking,
  SessionAudit,
  Student,
  StudioSettings,
  StudioTask,
  TaskParent,
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
  classes!: EntityTable<DanceClass, "id">;
  attendance!: EntityTable<Attendance, "id">;
  packages!: EntityTable<CoursePackage, "id">;
  enrollments!: EntityTable<Enrollment, "id">;
  payments!: EntityTable<Payment, "id">;
  receivables!: EntityTable<Receivable, "id">;
  tasks!: EntityTable<StudioTask, "id">;
  taskParents!: EntityTable<TaskParent, "id">;
  courses!: EntityTable<Course, "id">;
  rooms!: EntityTable<Room, "id">;
  promotions!: EntityTable<Promotion, "id">;
  holds!: EntityTable<Hold, "id">;
  bookings!: EntityTable<RoomBooking, "id">;
  branches!: EntityTable<Branch, "id">;
  sessions!: EntityTable<ClassSession, "id">;
  audits!: EntityTable<SessionAudit, "id">;
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
