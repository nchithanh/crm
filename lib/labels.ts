import { copy, type Lang } from "@/lib/copy";
import type { AttendStatus, DebtStatus, LeadStage, StudentStatus, TaskPriority, TaskStatus } from "@/types";

export function leadStages(lang: Lang) {
  const s = copy[lang].status;
  return [
    { id: "new" as const, label: s.leadNew },
    { id: "contacted" as const, label: s.leadContacted },
    { id: "trial" as const, label: s.trial },
    { id: "won" as const, label: s.leadWon },
    { id: "lost" as const, label: s.leadLost },
  ];
}

export function leadStageLabel(stage: LeadStage, lang: Lang) {
  return leadStages(lang).find((s) => s.id === stage)?.label ?? stage;
}

export function studentStatusLabel(status: StudentStatus, lang: Lang) {
  const s = copy[lang].status;
  if (status === "active") return s.active;
  if (status === "trial") return s.trial;
  return s.paused;
}

export function attendLabel(status: AttendStatus, lang: Lang) {
  const s = copy[lang].status;
  if (status === "present") return s.present;
  if (status === "absent") return s.absent;
  return s.excused;
}

export function debtLabel(status: DebtStatus, lang: Lang) {
  const s = copy[lang].status;
  if (status === "paid") return s.paid;
  if (status === "partial") return s.partial;
  if (status === "overdue") return s.overdue;
  return s.unpaid;
}

export function roleLabel(role: string, lang: Lang) {
  const r = copy[lang].role;
  if (role === "owner") return r.owner;
  if (role === "reception") return r.reception;
  return r.teacher;
}

export function sessionStatusLabel(status: string, lang: Lang) {
  const s = copy[lang].status;
  if (status === "upcoming") return s.upcoming;
  if (status === "ongoing") return s.ongoing;
  if (status === "completed") return s.completed;
  if (status === "cancelled") return s.cancelled;
  return status;
}

export function holdStatusLabel(status: string, lang: Lang) {
  const s = copy[lang].status;
  if (status === "pending") return s.holdPending;
  if (status === "approved") return s.holdApproved;
  if (status === "rejected") return s.holdRejected;
  return s.holdEnded;
}

export function taskStatuses(lang: Lang) {
  const t = copy[lang].task;
  return [
    { id: "todo" as const, label: t.todo },
    { id: "inprogress" as const, label: t.inprogress },
    { id: "verify" as const, label: t.verify },
    { id: "feedback" as const, label: t.feedback },
    { id: "done" as const, label: t.done },
  ];
}

export function taskStatusLabel(status: TaskStatus, lang: Lang) {
  return taskStatuses(lang).find((s) => s.id === status)?.label ?? status;
}

export function taskPriorities(lang: Lang) {
  const t = copy[lang].task;
  return [
    { id: "low" as const, label: t.low },
    { id: "medium" as const, label: t.medium },
    { id: "high" as const, label: t.high },
  ];
}

export function taskPriorityLabel(priority: TaskPriority, lang: Lang) {
  return taskPriorities(lang).find((p) => p.id === priority)?.label ?? priority;
}
