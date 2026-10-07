import type { Hold, Student } from "@/types";

export type StudentBadge = {
  label: string;
  tone: "ok" | "warn" | "danger" | "neutral" | "info";
};

export function studentBadges(student: Student, holds: Hold[], seeMoney: boolean): StudentBadge[] {
  const approved = holds.some((h) => h.studentId === student.id && h.status === "approved");
  const pending = holds.some((h) => h.studentId === student.id && h.status === "pending");
  const badges: StudentBadge[] = [];
  if (student.status === "paused") badges.push({ label: "Nghỉ", tone: "neutral" });
  else if (approved) badges.push({ label: "Bảo lưu", tone: "info" });
  else if (student.status === "trial") badges.push({ label: "Học thử", tone: "info" });
  else badges.push({ label: "Đang học", tone: "ok" });
  if (pending && !approved && student.status !== "paused") badges.push({ label: "Bảo lưu", tone: "warn" });
  if (seeMoney && student.debt > 0) badges.push({ label: "Nợ", tone: "danger" });
  return badges;
}
