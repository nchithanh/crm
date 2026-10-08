import { localDayKey } from "@/lib/utils";
import type { Installment, Lead, Payment, Student } from "@/types";

export function debtStatus(row: Installment, today = localDayKey()) {
  if (row.paid >= row.amount) return "paid" as const;
  if (row.dueDay < today) return "overdue" as const;
  if (row.paid > 0) return "partial" as const;
  return "unpaid" as const;
}

export function debtRemaining(row: Installment) {
  return Math.max(0, row.amount - row.paid);
}

export function monthPrefix(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function inLastDays(day: string, days: number, today = localDayKey()) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const key = localDayKey(start);
  return day >= key && day <= today;
}

export function dashboardNumbers(input: {
  students: Student[];
  leads: Lead[];
  payments: Payment[];
  receivables: Installment[];
  present: number;
  marked: number;
  todayClasses: number;
}) {
  const today = localDayKey();
  const weekStart = localDayKey(new Date(Date.now() - 6 * 86400000));
  const activeStudents = input.students.filter((s) => s.status === "active").length;
  const newLeads = input.leads.filter((l) => l.day >= weekStart && l.day <= today).length;
  const month = monthPrefix();
  const monthlyRevenue = input.payments
    .filter((p) => p.day.startsWith(month))
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = input.receivables.reduce((sum, r) => sum + debtRemaining(r), 0);
  const attendanceRate = input.marked === 0 ? 0 : Math.round((input.present / input.marked) * 100);
  return {
    activeStudents,
    newLeads,
    todayClasses: input.todayClasses,
    monthlyRevenue,
    outstanding,
    attendanceRate,
  };
}
