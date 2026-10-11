export type VerticalId = "nhay" | "anh" | "nhac" | "boi";

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
    color: "#111111",
    soft: "#F5F5F5",
  },
  {
    id: "anh",
    label: "Edu English",
    emoji: "📘",
    description: "Lớp tiếng Anh, học thử, học viên, học phí",
    color: "#111111",
    soft: "#F5F5F5",
  },
  {
    id: "nhac",
    label: "Edu Music",
    emoji: "🎵",
    description: "Lớp nhạc, học thử, học viên, học phí",
    color: "#111111",
    soft: "#F5F5F5",
  },
  {
    id: "boi",
    label: "Edu Swim",
    emoji: "🏊",
    description: "Lớp bơi, học thử, học viên, học phí",
    color: "#111111",
    soft: "#F5F5F5",
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

export function setStoredVertical(id: VerticalId) {
  localStorage.setItem(VERTICAL_STORAGE_KEY, id);
  applyVerticalTheme(id);
}

export function dbNameForVertical(id: VerticalId) {
  return `dolphin_crm_${id}`;
}
