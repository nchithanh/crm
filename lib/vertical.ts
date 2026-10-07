export type VerticalId = "nhay";

export const VERTICAL_STORAGE_KEY = "dolphin-crm-vertical";

export type VerticalOption = {
  id: VerticalId;
  label: string;
  emoji: string;
  description: string;
  color: string;
};

/**
 * Lĩnh vực có thư mục JSON `data/{id}/`.
 * Thêm lĩnh vực: tạo folder JSON + một dòng ở đây + import trong `lib/seed.ts`.
 */
export const VERTICALS: VerticalOption[] = [
  {
    id: "nhay",
    label: "Trung tâm dạy nhảy",
    emoji: "💃",
    description: "Lớp nhảy, học thử, học viên, học phí",
    color: "#F97316",
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

export function setStoredVertical(id: VerticalId) {
  localStorage.setItem(VERTICAL_STORAGE_KEY, id);
}

export function dbNameForVertical(id: VerticalId) {
  return `dolphin_crm_${id}`;
}
