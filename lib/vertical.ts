export type VerticalId = "nhay" | "anh" | "nhac" | "boi";

export const VERTICAL_STORAGE_KEY = "dolphin-crm-vertical";

export type VerticalOption = {
  id: VerticalId;
  label: string;
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
    description: "Lớp nhảy, học thử, học viên, học phí",
    color: "#F97316",
    soft: "#FFF7ED",
  },
  {
    id: "anh",
    label: "Edu English",
    description: "Lớp tiếng Anh, học thử, học viên, học phí",
    color: "#2563EB",
    soft: "#EFF6FF",
  },
  {
    id: "nhac",
    label: "Edu Music",
    description: "Lớp nhạc, học thử, học viên, học phí",
    color: "#7C3AED",
    soft: "#F5F3FF",
  },
  {
    id: "boi",
    label: "Edu Swim",
    description: "Lớp bơi, học thử, học viên, học phí",
    color: "#0891B2",
    soft: "#ECFEFF",
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
