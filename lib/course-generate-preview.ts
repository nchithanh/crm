import { sessionDates } from "@/lib/schedule";
import { localDayKey } from "@/lib/utils";

/** Một buổi dự kiến trong drawer sinh lớp (FE). */
export type GenerateSession = {
  day: string;
  start: string;
  end: string;
  enabled: boolean;
};

export type GenerateWeek = {
  weekStart: string;
  weekEnd: string;
  days: string[];
};

function parseLocal(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
}

/** Thứ 2 của tuần chứa `day` (CN thuộc tuần trước). */
export function mondayOf(day: string): string {
  const d = parseLocal(day);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDayKey(d);
}

export function sundayOf(weekStartMonday: string): string {
  const d = parseLocal(weekStartMonday);
  d.setDate(d.getDate() + 6);
  return localDayKey(d);
}

export function dowOf(day: string): number {
  return parseLocal(day).getDay();
}

/** Danh sách buổi dự kiến từ lịch mẫu khóa. */
export function buildGenerateSessions(input: {
  startDay: string;
  weekdays: number[];
  sessionCount: number;
  start: string;
  end: string;
}): GenerateSession[] {
  const count = Math.max(1, Math.min(80, input.sessionCount || 8));
  const days = sessionDates(input.startDay, input.weekdays, count);
  return days.map((day) => ({
    day,
    start: input.start || "18:00",
    end: input.end || "19:00",
    enabled: true,
  }));
}

/** Nhóm theo tuần (Mon–Sun) để bulk bật/tắt. */
export function groupSessionsByWeek(sessions: GenerateSession[]): GenerateWeek[] {
  const map = new Map<string, string[]>();
  for (const s of sessions) {
    const mon = mondayOf(s.day);
    const list = map.get(mon) ?? [];
    list.push(s.day);
    map.set(mon, list);
  }
  return [...map.entries()].map(([weekStart, days]) => ({
    weekStart,
    weekEnd: sundayOf(weekStart),
    days,
  }));
}

export function weekEnabledState(
  sessions: GenerateSession[],
  weekDays: string[],
): "all" | "none" | "partial" {
  const set = new Set(weekDays);
  const inWeek = sessions.filter((s) => set.has(s.day));
  if (inWeek.length === 0) return "none";
  const on = inWeek.filter((s) => s.enabled).length;
  if (on === 0) return "none";
  if (on === inWeek.length) return "all";
  return "partial";
}

export function selectedGenerateDays(sessions: GenerateSession[]): string[] {
  return sessions.filter((s) => s.enabled).map((s) => s.day);
}

/** Payload sẵn cho API sau này — hiện FE chưa gửi. */
export function selectedGenerateSessions(
  sessions: GenerateSession[],
): { day: string; start: string; end: string }[] {
  return sessions
    .filter((s) => s.enabled)
    .map((s) => ({ day: s.day, start: s.start, end: s.end }));
}

export function sessionTimeCustom(
  session: GenerateSession,
  templateStart: string,
  templateEnd: string,
): boolean {
  return session.start !== templateStart || session.end !== templateEnd;
}

/** Ô calendar tháng: Monday-first. */
export function monthCells(monthKey: string): { day: string | null; inMonth: boolean }[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, (m ?? 1) - 1, 1, 12);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: { day: string | null; inMonth: boolean }[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push({ day: null, inMonth: false });
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ day: localDayKey(new Date(y, (m ?? 1) - 1, d, 12)), inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, inMonth: false });
  return cells;
}

export function monthKeyOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
