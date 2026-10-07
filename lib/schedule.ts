import { localDayKey } from "@/lib/utils";
import type { ClassSession, SessionStatus } from "@/types";

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

export function sessionConflicts(
  all: ClassSession[],
  next: { id?: string; day: string; start: string; end: string; teacherId: string; roomId: string },
) {
  return all.filter(
    (s) =>
      s.id !== next.id &&
      s.status !== "cancelled" &&
      s.day === next.day &&
      rangesOverlap(s.start, s.end, next.start, next.end) &&
      (s.roomId === next.roomId || s.teacherId === next.teacherId),
  );
}

export function conflictLabel(
  all: ClassSession[],
  next: { id?: string; day: string; start: string; end: string; teacherId: string; roomId: string },
) {
  const hits = sessionConflicts(all, next);
  if (hits.length === 0) return "";
  const room = hits.some((h) => h.roomId === next.roomId);
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

export function sessionStatus(day: string, index: number, cancelIndex?: number): SessionStatus {
  if (cancelIndex && index === cancelIndex) return "cancelled";
  const today = localDayKey();
  if (day < today) return "completed";
  if (day === today) return "ongoing";
  return "upcoming";
}

export function nextJoinSession(sessions: ClassSession[]) {
  const today = localDayKey();
  return (
    [...sessions]
      .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.day >= today)
      .sort((a, b) => a.index - b.index)[0] ?? null
  );
}

export function sessionsLeftInCourse(sessions: ClassSession[], fromIndex: number) {
  return sessions.filter((s) => s.index >= fromIndex && s.status !== "cancelled").length;
}

export function proratedFee(price: number, packageSessions: number, granted: number) {
  if (packageSessions <= 0 || granted <= 0) return 0;
  return Math.round((price * granted) / packageSessions);
}
