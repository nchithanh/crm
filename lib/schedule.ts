import { localDayKey } from "@/lib/utils";
import type { ClassSession, SessionStatus } from "@/types";

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
