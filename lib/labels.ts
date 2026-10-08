import { copy, type Lang } from "@/lib/copy";
import type { AttendStatus, DebtStatus, LeadStage, StudentStatus } from "@/types";

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
