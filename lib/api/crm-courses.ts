import { crmFetch } from "@/lib/api/crm-client";
import type { ClassStatus, Course, CourseTeacher, Level, StudioClass } from "@/types";

export type MaCourse = Course & {
  classesGenerated: boolean;
  canDelete: boolean;
  classCount: number;
  studentCount: number;
  teachers: CourseTeacher[];
  roomIds: string[];
};

type ApiCourseTeacher = { teacher_id: number; role: string };
type ApiCourse = {
  id: number;
  branch_id: number;
  name: string;
  style: string;
  level: string;
  slot: string;
  teacher_id: number;
  room_id: number;
  start_day: string | null;
  end_day: string | null;
  weekdays: number[];
  start: string;
  end: string;
  session_count: number;
  capacity: number;
  duration_months: number;
  description: string;
  active: boolean;
  classes_generated: boolean;
  can_delete: boolean;
  class_count: number;
  student_count: number;
  teachers?: ApiCourseTeacher[];
  room_ids?: number[];
};

function mapLevel(level: string): Level {
  return level === "inter" || level === "advance" ? level : "begin";
}

export function mapMaCourse(c: ApiCourse): MaCourse {
  const id = String(c.id);
  const teachers: CourseTeacher[] = (c.teachers ?? []).map((t, i) => ({
    id: `${id}-t${i}`,
    courseId: id,
    teacherId: String(t.teacher_id),
    role: t.role === "assistant" ? "assistant" : "main",
  }));
  const roomIds = (c.room_ids ?? []).map(String).filter((x) => x && x !== "0");

  return {
    id,
    name: c.name,
    style: c.style || c.name,
    level: mapLevel(c.level),
    slot: c.slot || "",
    branchId: String(c.branch_id),
    teacherId: String(c.teacher_id),
    roomId: c.room_id > 0 ? String(c.room_id) : "",
    startDay: c.start_day || "",
    endDay: c.end_day || "",
    weekdays: Array.isArray(c.weekdays) ? c.weekdays.map(Number) : [],
    start: c.start,
    end: c.end,
    sessionCount: c.session_count,
    capacity: c.capacity,
    durationMonths: c.duration_months,
    description: c.description || "",
    active: Boolean(c.active),
    classesGenerated: Boolean(c.classes_generated),
    canDelete: Boolean(c.can_delete),
    classCount: c.class_count ?? 0,
    studentCount: c.student_count ?? 0,
    teachers,
    roomIds,
  };
}

export async function fetchMaCourses(opts?: { branchId?: string; active?: boolean }): Promise<MaCourse[]> {
  const q = new URLSearchParams();
  if (opts?.branchId && opts.branchId !== "all") q.set("branch_id", opts.branchId);
  if (opts?.active !== undefined) q.set("active", opts.active ? "1" : "0");
  const qs = q.toString();
  const res = await crmFetch<{ data: ApiCourse[] }>(`/courses${qs ? `?${qs}` : ""}`);
  return (res.data ?? []).map(mapMaCourse);
}

export async function fetchMaCourse(id: string): Promise<MaCourse> {
  const res = await crmFetch<{ data: ApiCourse }>(`/courses/${id}`);
  return mapMaCourse(res.data);
}

export async function apiCreateCourse(input: {
  name: string;
  style?: string;
  level: Level;
  branchId: string;
  teacherId: string;
  assistantIds?: string[];
  roomId?: string;
  weekdays: number[];
  start: string;
  end: string;
  startDay: string;
  endDay?: string;
  sessionCount?: number;
  capacity?: number;
  durationMonths?: number;
  description?: string;
}): Promise<MaCourse> {
  const res = await crmFetch<{ data: ApiCourse }>("/courses", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      style: input.style,
      level: input.level,
      branch_id: Number(input.branchId),
      teacher_id: Number(input.teacherId),
      assistant_ids: (input.assistantIds ?? []).map(Number).filter((n) => n > 0),
      room_id: input.roomId ? Number(input.roomId) : 0,
      weekdays: input.weekdays,
      start: input.start,
      end: input.end,
      start_day: input.startDay,
      end_day: input.endDay || null,
      session_count: input.sessionCount ?? 8,
      capacity: input.capacity ?? 12,
      duration_months: input.durationMonths ?? 1,
      description: input.description ?? "",
    }),
  });
  return mapMaCourse(res.data);
}

export async function apiDeactivateCourse(id: string): Promise<MaCourse> {
  const res = await crmFetch<{ data: ApiCourse }>(`/courses/${id}/deactivate`, { method: "POST" });
  return mapMaCourse(res.data);
}

export async function apiActivateCourse(id: string): Promise<MaCourse> {
  const res = await crmFetch<{ data: ApiCourse }>(`/courses/${id}/activate`, { method: "POST" });
  return mapMaCourse(res.data);
}

export async function apiDeleteCourse(id: string): Promise<void> {
  await crmFetch(`/courses/${id}`, { method: "DELETE" });
}

type ApiClass = {
  id: number;
  course_id: number;
  branch_id: number;
  index: number;
  name: string;
  day: string;
  start: string;
  end: string;
  teacher_id: number;
  room_id: number;
  status: string;
  capacity: number;
  note: string;
};

export function mapMaClass(c: ApiClass): StudioClass {
  return {
    id: String(c.id),
    courseId: String(c.course_id),
    branchId: String(c.branch_id),
    index: c.index,
    name: c.name,
    day: c.day,
    start: c.start,
    end: c.end,
    teacherId: c.teacher_id > 0 ? String(c.teacher_id) : "",
    roomId: c.room_id > 0 ? String(c.room_id) : "",
    status: (["upcoming", "ongoing", "completed", "cancelled"].includes(c.status)
      ? c.status
      : "upcoming") as ClassStatus,
    capacity: c.capacity,
    note: c.note || "",
  };
}

export async function fetchMaCourseClasses(courseId: string): Promise<StudioClass[]> {
  const res = await crmFetch<{ data: ApiClass[] }>(`/courses/${courseId}/classes`);
  return (res.data ?? []).map(mapMaClass);
}

export async function apiGenerateCourseClasses(
  courseId: string,
  sessions: { day: string; start: string; end: string }[],
): Promise<{ course: MaCourse; classes: StudioClass[] }> {
  const res = await crmFetch<{
    data: { course: ApiCourse; classes: ApiClass[] };
  }>(`/courses/${courseId}/generate-classes`, {
    method: "POST",
    body: JSON.stringify({ sessions }),
  });
  return {
    course: mapMaCourse(res.data.course),
    classes: (res.data.classes ?? []).map(mapMaClass),
  };
}
