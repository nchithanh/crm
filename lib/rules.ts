import type { Level } from "@/types";

export function levelLabel(level: string) {
  if (level === "begin") return "Begin";
  if (level === "inter") return "Inter";
  if (level === "advance") return "Advance";
  return level;
}

/** Buổi kế tiếp mà học viên có thể vào giữa khóa. */
export function canJoinAtSession(level: Level, sessionIndex: number) {
  if (sessionIndex < 1) {
    return { ok: false, reason: "Khóa chưa có buổi để ghi danh." };
  }
  if (level === "begin" && sessionIndex >= 4) {
    return { ok: false, reason: "Begin ngừng nhận từ buổi 4." };
  }
  if (level === "inter" && sessionIndex % 2 === 0) {
    return { ok: false, reason: "Inter chỉ nhận các buổi lẻ." };
  }
  if (level === "advance" && sessionIndex !== 1 && sessionIndex !== 5) {
    return { ok: false, reason: "Advance chỉ nhận buổi 1 và buổi 5." };
  }
  return { ok: true, reason: `Được vào từ buổi ${sessionIndex}.` };
}

export function deductsCredit(status: string) {
  return status === "present" || status === "absent" || status === "excused";
}
