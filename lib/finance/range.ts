import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { localDayKey } from "@/lib/utils";

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "lastMonth"
  | "custom";

export const RANGE_OPTIONS: { id: RangeKey; labelVi: string; labelEn: string }[] = [
  { id: "today", labelVi: "Hôm nay", labelEn: "Today" },
  { id: "yesterday", labelVi: "Hôm qua", labelEn: "Yesterday" },
  { id: "7d", labelVi: "7 ngày", labelEn: "7 days" },
  { id: "30d", labelVi: "30 ngày", labelEn: "30 days" },
  { id: "month", labelVi: "Tháng này", labelEn: "This month" },
  { id: "lastMonth", labelVi: "Tháng trước", labelEn: "Last month" },
  { id: "custom", labelVi: "Tùy chỉnh", labelEn: "Custom" },
];

export interface DateWindow {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function dateWindow(
  key: RangeKey,
  now = new Date(),
  custom?: { from: string; to: string },
): DateWindow {
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (key === "yesterday") {
    start = startOfDay(subDays(now, 1));
    end = endOfDay(subDays(now, 1));
  } else if (key === "7d") {
    start = startOfDay(subDays(now, 6));
  } else if (key === "30d") {
    start = startOfDay(subDays(now, 29));
  } else if (key === "month") {
    start = startOfMonth(now);
    end = endOfDay(now);
  } else if (key === "lastMonth") {
    const prev = subMonths(now, 1);
    start = startOfMonth(prev);
    end = endOfMonth(prev);
  } else if (key === "custom" && custom?.from && custom?.to) {
    start = startOfDay(new Date(`${custom.from}T12:00:00`));
    end = endOfDay(new Date(`${custom.to}T12:00:00`));
  }

  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start, end, prevStart, prevEnd };
}

/** Payment / installment day keys are `YYYY-MM-DD`. */
export function dayInWindow(day: string, start: Date, end: Date) {
  const key = localDayKey(start);
  const endKey = localDayKey(end);
  return day >= key && day <= endKey;
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatPct(n: number) {
  const sign = n > 0 ? "↑" : n < 0 ? "↓" : "→";
  return `${sign} ${Math.abs(n).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}
