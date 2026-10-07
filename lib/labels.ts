import type { AttendStatus, DebtStatus, LeadStage, StudentStatus } from "@/types";

export const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: "new", label: "Mới" },
  { id: "contacted", label: "Đã liên hệ" },
  { id: "trial", label: "Học thử" },
  { id: "won", label: "Chốt" },
  { id: "lost", label: "Thất bại" },
];

export function leadStageLabel(stage: LeadStage) {
  return LEAD_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function studentStatusLabel(status: StudentStatus) {
  if (status === "active") return "Đang học";
  if (status === "trial") return "Học thử";
  return "Tạm nghỉ";
}

export function attendLabel(status: AttendStatus) {
  if (status === "present") return "Có mặt";
  if (status === "absent") return "Vắng";
  return "Có phép";
}

export function debtLabel(status: DebtStatus) {
  if (status === "paid") return "Đã thu";
  if (status === "partial") return "Thu một phần";
  if (status === "overdue") return "Quá hạn";
  return "Chưa thu";
}

export function roleLabel(role: string) {
  if (role === "owner") return "Chủ studio";
  if (role === "reception") return "Lễ tân";
  return "Giáo viên";
}
