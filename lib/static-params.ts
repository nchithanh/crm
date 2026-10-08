/**
 * IDs for `generateStaticParams` (GitHub Pages `output: export`).
 * Class IDs mirror seed: `{courseId}-c{1..sessionCount}`.
 */
import nhay_courses from "@/data/nhay/courses.json";
import nhay_students from "@/data/nhay/students.json";
import nhay_users from "@/data/nhay/users.json";
import anh_courses from "@/data/anh/courses.json";
import anh_students from "@/data/anh/students.json";
import anh_users from "@/data/anh/users.json";
import nhac_courses from "@/data/nhac/courses.json";
import nhac_students from "@/data/nhac/students.json";
import nhac_users from "@/data/nhac/users.json";
import boi_courses from "@/data/boi/courses.json";
import boi_students from "@/data/boi/students.json";
import boi_users from "@/data/boi/users.json";

type CourseSeed = { id: string; sessionCount?: number };
type IdRow = { id: string; role?: string };

function uniq(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function asParams(ids: string[]) {
  return uniq(ids).map((id) => ({ id }));
}

const allCourses = [
  ...(nhay_courses as CourseSeed[]),
  ...(anh_courses as CourseSeed[]),
  ...(nhac_courses as CourseSeed[]),
  ...(boi_courses as CourseSeed[]),
];

const allStudents = [
  ...(nhay_students as IdRow[]),
  ...(anh_students as IdRow[]),
  ...(nhac_students as IdRow[]),
  ...(boi_students as IdRow[]),
];

const allUsers = [
  ...(nhay_users as IdRow[]),
  ...(anh_users as IdRow[]),
  ...(nhac_users as IdRow[]),
  ...(boi_users as IdRow[]),
];

export function courseStaticParams() {
  return asParams(allCourses.map((c) => c.id));
}

export function studentStaticParams() {
  return asParams(allStudents.map((s) => s.id));
}

export function teacherStaticParams() {
  return asParams(allUsers.filter((u) => u.role === "teacher").map((u) => u.id));
}

export function classStaticParams() {
  const ids: string[] = [];
  for (const c of allCourses) {
    const n = Math.max(1, c.sessionCount ?? 8);
    for (let i = 1; i <= n; i++) ids.push(`${c.id}-c${i}`);
  }
  return asParams(ids);
}
