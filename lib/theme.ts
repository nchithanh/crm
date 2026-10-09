export type CrmTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "crm-theme";

export function isCrmTheme(value: string): value is CrmTheme {
  return value === "light" || value === "dark";
}

export function applyDocumentTheme(theme: CrmTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function readStoredTheme(): CrmTheme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && isCrmTheme(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

export function writeStoredTheme(theme: CrmTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
