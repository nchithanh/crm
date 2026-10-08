import { localDayKey } from "@/lib/utils";
import type { ClassStatus, StudioClass } from "@/types";

export const GRID_START = 7;
export const GRID_END = 22;

export function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function rangesOverlap(a0: string, a1: string, b0: string, b1: string) {
  return minutesOf(a0) < minutesOf(b1) && minutesOf(b0) < minutesOf(a1);
}

export function classConflicts(
  all: StudioClass[],
  next: { id?: string; day: string; start: string; end: string; teacherId: string; roomId: string },
) {
  return all.filter(
    (s) =>
      s.id !== next.id &&
      s.status !== "cancelled" &&
      s.day === next.day &&
      rangesOverlap(s.start, s.end, next.start, next.end) &&
      ((next.roomId && s.roomId === next.roomId) || (next.teacherId && s.teacherId === next.teacherId)),
  );
}

/** @deprecated use classConflicts */
export const sessionConflicts = classConflicts;

export function conflictLabel(
  all: StudioClass[],
  next: { id?: string; day: string; start: string; end: string; teacherId: string; roomId: string },
) {
  const hits = classConflicts(all, next);
  if (hits.length === 0) return "";
  const room = hits.some((h) => h.roomId && h.roomId === next.roomId);
  const teacher = hits.some((h) => h.teacherId === next.teacherId);
  if (room && teacher) return "Trùng phòng và giáo viên";
  if (room) return "Trùng phòng";
  return "Trùng giáo viên";
}

export function sessionDates(startDay: string, weekdays: number[], count = 8) {
  const [y, m, d] = startDay.split("-").map(Number);
  const cursor = new Date(y, (m ?? 1) - 1, d ?? 1, 12);
  const out: string[] = [];
  for (let i = 0; i < 70 && out.length < count; i++) {
    if (weekdays.includes(cursor.getDay())) out.push(localDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function classStatus(day: string, index: number, cancelIndex?: number): ClassStatus {
  if (cancelIndex && index === cancelIndex) return "cancelled";
  const today = localDayKey();
  if (day < today) return "completed";
  if (day === today) return "ongoing";
  return "upcoming";
}

/** @deprecated use classStatus */
export const sessionStatus = classStatus;

export function nextJoinClass(classes: StudioClass[]) {
  const today = localDayKey();
  return (
    [...classes]
      .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.day >= today)
      .sort((a, b) => a.index - b.index)[0] ?? null
  );
}

/** @deprecated use nextJoinClass */
export const nextJoinSession = nextJoinClass;

export function classesLeftInCourse(classes: StudioClass[], fromIndex: number) {
  return classes.filter((s) => s.index >= fromIndex && s.status !== "cancelled").length;
}

/** @deprecated use classesLeftInCourse */
export const sessionsLeftInCourse = classesLeftInCourse;

export function slotLine(weekdays: number[], start: string) {
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const days = [...weekdays]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => labels[d] ?? "")
    .filter(Boolean);
  return `${days.join(" · ")} · ${start}`;
}

export function proratedFee(price: number, granted: number, packSessions: number) {
  return Math.round((price * granted) / Math.max(1, packSessions));
}
