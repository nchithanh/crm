import { copy, type Lang } from "@/lib/copy";
import type { Level } from "@/types";

export function levelLabel(level: string) {
  if (level === "begin") return "Begin";
  if (level === "inter") return "Inter";
  if (level === "advance") return "Advance";
  return level;
}

/** Buổi kế tiếp mà học viên có thể vào giữa khóa. */
export function canJoinAtSession(level: Level, sessionIndex: number, lang: Lang = "vi") {
  const t = copy[lang].enroll;
  if (sessionIndex < 1) {
    return { ok: false, reason: t.noSession };
  }
  if (level === "begin" && sessionIndex >= 4) {
    return { ok: false, reason: t.beginStop };
  }
  if (level === "inter" && sessionIndex % 2 === 0) {
    return { ok: false, reason: t.interOdd };
  }
  if (level === "advance" && sessionIndex !== 1 && sessionIndex !== 5) {
    return { ok: false, reason: t.advanceOnly };
  }
  return { ok: true, reason: t.joinFrom.replace("{n}", String(sessionIndex)) };
}

export function deductsCredit(status: string) {
  return status === "present" || status === "absent" || status === "excused";
}
