import { copy, type Lang } from "@/lib/copy";
import type { Hold, Student } from "@/types";

export type StudentBadge = {
  label: string;
  tone: "ok" | "warn" | "danger" | "neutral" | "info";
};

export function studentBadges(student: Student, holds: Hold[], seeMoney: boolean, lang: Lang): StudentBadge[] {
  const label = copy[lang].students;
  const approved = holds.some((h) => h.studentId === student.id && h.status === "approved");
  const pending = holds.some((h) => h.studentId === student.id && h.status === "pending");
  const badges: StudentBadge[] = [];
  if (student.status === "paused") badges.push({ label: label.badgePaused, tone: "neutral" });
  else if (approved) badges.push({ label: label.badgeHold, tone: "info" });
  else if (student.status === "trial") badges.push({ label: copy[lang].status.trial, tone: "info" });
  else badges.push({ label: label.badgeStudy, tone: "ok" });
  if (pending && !approved && student.status !== "paused") badges.push({ label: label.badgeHold, tone: "warn" });
  if (seeMoney && student.debt > 0) badges.push({ label: label.badgeDebt, tone: "danger" });
  return badges;
}
