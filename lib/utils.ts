import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVnd(amount: number) {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

export function localDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayFromOffset(offset: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localDayKey(d);
}

export function weekdayLabel(weekday: number, lang: "vi" | "en" = "vi") {
  const names = lang === "en"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return names[weekday] ?? "";
}

export function weekdayShort(weekday: number, lang: "vi" | "en" = "vi") {
  const names = lang === "en"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return names[weekday] ?? "";
}

export function ageYears(birthDay: string, today = new Date()) {
  if (!birthDay) return null;
  const [y, m, d] = birthDay.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = today.getFullYear() - y;
  const now = (today.getMonth() + 1) * 100 + today.getDate();
  if (now < m * 100 + d) age -= 1;
  return age;
}

export function isMinor(birthDay: string) {
  const age = ageYears(birthDay);
  return age !== null && age < 18;
}

export function roomWithBranch(roomName: string, branchName?: string) {
  return branchName ? `[${branchName}] ${roomName}` : roomName;
}

export function zaloHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://zalo.me/${digits}` : "";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Relative label for YYYY-MM-DD vs today (vi/en short). */
export function relativeDayLabel(day: string, lang: "vi" | "en" = "vi") {
  if (!day) return "";
  const today = localDayKey();
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = day.split("-").map(Number);
  if (!ty || !dy) return day;
  const a = Date.UTC(ty, tm - 1, td);
  const b = Date.UTC(dy, dm - 1, dd);
  const diff = Math.round((a - b) / 86400000);
  if (diff === 0) return lang === "en" ? "Today" : "Hôm nay";
  if (diff === 1) return lang === "en" ? "Yesterday" : "Hôm qua";
  if (diff > 1 && diff < 7) return lang === "en" ? `${diff}d ago` : `${diff} ngày trước`;
  if (diff < 0 && diff > -7) return lang === "en" ? `In ${-diff}d` : `Sau ${-diff} ngày`;
  return day;
}
