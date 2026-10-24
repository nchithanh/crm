export type VerticalId = "nhay" | "anh" | "nhac" | "boi" | "spa" | "nails" | "salon" | "massage";

export const VERTICAL_STORAGE_KEY = "dolphin-crm-vertical";

export type VerticalOption = {
  id: VerticalId;
  label: string;
  /** Emoji lĩnh vực — UI chọn lĩnh vực / login (kiểu POS) */
  emoji: string;
  description: string;
  color: string;
  soft: string;
};

/**
 * Lĩnh vực có thư mục JSON `data/{id}/`.
 * Thêm lĩnh vực: tạo folder JSON + một dòng ở đây + import trong `lib/seed-data.ts`.
 */
export const VERTICALS: VerticalOption[] = [
  {
    id: "nhay",
    label: "Edu Dance",
    emoji: "💃",
    description: "Lớp nhảy, học thử, học viên, học phí",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "anh",
    label: "Edu English",
    emoji: "📘",
    description: "Lớp tiếng Anh, học thử, học viên, học phí",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "nhac",
    label: "Edu Music",
    emoji: "🎵",
    description: "Lớp nhạc, học thử, học viên, học phí",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "boi",
    label: "Edu Swim",
    emoji: "🏊",
    description: "Lớp bơi, học thử, học viên, học phí",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "spa",
    label: "Spa",
    emoji: "💆",
    description: "Liệu trình spa, đặt lịch, khách, gói",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "nails",
    label: "Nails",
    emoji: "💅",
    description: "Nail gel, design, pedicure, gói buổi",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "salon",
    label: "Salon",
    emoji: "💇",
    description: "Cắt uốn nhuộm, ghế, khách, gói",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
  {
    id: "massage",
    label: "Massage",
    emoji: "🧘",
    description: "Body, foot, liệu trình, phòng, gói",
    color: "#5d5cc4",
    soft: "#f1f1f9",
  },
];

const IDS = new Set<string>(VERTICALS.map((v) => v.id));

export function isVertical(v: string | null | undefined): v is VerticalId {
  return !!v && IDS.has(v);
}

export function getStoredVertical(): VerticalId | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(VERTICAL_STORAGE_KEY);
  return isVertical(raw) ? raw : null;
}

export function applyVerticalTheme(id: VerticalId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.vertical = id;
}

/** CustomEvent name — AuthGate lắng nghe để boot lại DB khi đổi lĩnh vực trên /login. */
export const VERTICAL_CHANGE_EVENT = "dolphin-crm-vertical";

export function setStoredVertical(id: VerticalId) {
  localStorage.setItem(VERTICAL_STORAGE_KEY, id);
  applyVerticalTheme(id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VERTICAL_CHANGE_EVENT, { detail: id }));
  }
}

/** Xóa lĩnh vực demo — dùng khi chọn login MA (không gắn vertical Dexie). */
export function clearStoredVertical() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VERTICAL_STORAGE_KEY);
  document.documentElement.removeAttribute("data-vertical");
  window.dispatchEvent(new CustomEvent(VERTICAL_CHANGE_EVENT, { detail: null }));
}

export function dbNameForVertical(id: VerticalId) {
  return `dolphin_crm_${id}`;
}
