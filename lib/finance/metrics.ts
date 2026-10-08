import { debtRemaining } from "@/lib/metrics";
import { dayInWindow, pctChange, type DateWindow } from "@/lib/finance/range";
import { localDayKey } from "@/lib/utils";
import type { Course, Installment, Payment, Student } from "@/types";

export type DebtUiStatus = "paid" | "ok" | "due_soon" | "overdue";

export type AgeBucket = "0-7" | "8-30" | "31-60" | "60+";

export function debtUiStatus(row: Installment, today = localDayKey()): DebtUiStatus {
  if (debtRemaining(row) <= 0) return "paid";
  if (row.dueDay < today) return "overdue";
  const soon = new Date(`${today}T12:00:00`);
  soon.setDate(soon.getDate() + 3);
  if (row.dueDay <= localDayKey(soon)) return "due_soon";
  return "ok";
}

export function debtAgeBucket(row: Installment, today = localDayKey()): AgeBucket {
  if (row.dueDay >= today) return "0-7";
  const due = new Date(`${row.dueDay}T12:00:00`).getTime();
  const now = new Date(`${today}T12:00:00`).getTime();
  const days = Math.floor((now - due) / 86400000);
  if (days <= 7) return "0-7";
  if (days <= 30) return "8-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export function agingSums(rows: Installment[], today = localDayKey()) {
  const open = rows.filter((r) => debtRemaining(r) > 0);
  const buckets: Record<AgeBucket, number> = { "0-7": 0, "8-30": 0, "31-60": 0, "60+": 0 };
  for (const r of open) {
    buckets[debtAgeBucket(r, today)] += debtRemaining(r);
  }
  return {
    total: open.reduce((s, r) => s + debtRemaining(r), 0),
    count: open.length,
    buckets,
  };
}

function sumPayments(payments: Payment[], start: Date, end: Date, branchId?: string | null) {
  return payments
    .filter((p) => dayInWindow(p.day, start, end) && (!branchId || p.branchId === branchId))
    .reduce((s, p) => s + p.amount, 0);
}

export function periodSnapshot(payments: Payment[], window: DateWindow, branchId?: string | null) {
  const collected = sumPayments(payments, window.start, window.end, branchId);
  const prevCollected = sumPayments(payments, window.prevStart, window.prevEnd, branchId);
  const cash = payments
    .filter((p) => dayInWindow(p.day, window.start, window.end) && (!branchId || p.branchId === branchId) && p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const transfer = collected - cash;
  return {
    collected,
    cash,
    transfer,
    delta: pctChange(collected, prevCollected),
  };
}

export function collectionSeries(payments: Payment[], days: number, branchId?: string | null) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = localDayKey(d);
    const amount = payments
      .filter((p) => p.day === key && (!branchId || p.branchId === branchId))
      .reduce((s, p) => s + p.amount, 0);
    return { label: key.slice(5), day: key, amount };
  });
}

export function revenueByMethod(payments: Payment[], window: DateWindow, branchId?: string | null) {
  const rows = payments.filter((p) => dayInWindow(p.day, window.start, window.end) && (!branchId || p.branchId === branchId));
  const cash = rows.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const transfer = rows.filter((p) => p.method === "transfer").reduce((s, p) => s + p.amount, 0);
  return [
    { name: "cash", value: cash, color: "#10B981" },
    { name: "transfer", value: transfer, color: "#0EA5E9" },
  ];
}

export function revenueByCourse(
  payments: Payment[],
  students: Student[],
  courses: Course[],
  window: DateWindow,
  branchId?: string | null,
) {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (!dayInWindow(p.day, window.start, window.end)) continue;
    if (branchId && p.branchId !== branchId) continue;
    const st = students.find((s) => s.id === p.studentId);
    const courseId = st?.courseId || "_";
    map.set(courseId, (map.get(courseId) || 0) + p.amount);
  }
  return [...map.entries()]
    .map(([id, value]) => ({
      name: courses.find((c) => c.id === id)?.name || "—",
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function watchDebts(installments: Installment[], limit = 5, today = localDayKey()) {
  return installments
    .filter((r) => {
      const st = debtUiStatus(r, today);
      return st === "overdue" || st === "due_soon";
    })
    .sort((a, b) => a.dueDay.localeCompare(b.dueDay))
    .slice(0, limit);
}
