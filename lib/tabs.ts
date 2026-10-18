/** Registry tab con trong trang — SoT cho ma trận Phân quyền. */

export type TabKey =
  | "student.overview"
  | "student.courses"
  | "student.attendance"
  | "student.money"
  | "student.hold"
  | "student.notes"
  | "room.calendar"
  | "room.list"
  | "course.overview"
  | "course.classes"
  | "course.students"
  | "course.teachers"
  | "course.subscriptions";

export type TabGroupKey = "student" | "room" | "course";

export type TabDef = {
  key: TabKey;
  group: TabGroupKey;
  /** Id dùng trong UI trang (student drawer / rooms / course hub). */
  localId: string;
};

export const TAB_DEFS: TabDef[] = [
  { key: "student.overview", group: "student", localId: "overview" },
  { key: "student.courses", group: "student", localId: "courses" },
  { key: "student.attendance", group: "student", localId: "attendance" },
  { key: "student.money", group: "student", localId: "money" },
  { key: "student.hold", group: "student", localId: "hold" },
  { key: "student.notes", group: "student", localId: "notes" },
  { key: "room.calendar", group: "room", localId: "calendar" },
  { key: "room.list", group: "room", localId: "list" },
  { key: "course.overview", group: "course", localId: "overview" },
  { key: "course.classes", group: "course", localId: "classes" },
  { key: "course.students", group: "course", localId: "students" },
  { key: "course.teachers", group: "course", localId: "teachers" },
  { key: "course.subscriptions", group: "course", localId: "subscriptions" },
];

export const TAB_GROUPS: { key: TabGroupKey; tabs: TabDef[] }[] = [
  { key: "student", tabs: TAB_DEFS.filter((t) => t.group === "student") },
  { key: "room", tabs: TAB_DEFS.filter((t) => t.group === "room") },
  { key: "course", tabs: TAB_DEFS.filter((t) => t.group === "course") },
];

export function tabKeyFor(group: TabGroupKey, localId: string): TabKey | null {
  return TAB_DEFS.find((t) => t.group === group && t.localId === localId)?.key ?? null;
}
