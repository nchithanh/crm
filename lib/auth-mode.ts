/** demo = PIN + Dexie theo vertical · ma = login Ma Dance qua POST /crm/login. */
export type AuthMode = "demo" | "ma";

export const AUTH_MODE_STORAGE_KEY = "dolphin-crm-auth-mode";

export function getStoredAuthMode(): AuthMode {
  if (typeof window === "undefined") return "demo";
  return localStorage.getItem(AUTH_MODE_STORAGE_KEY) === "ma" ? "ma" : "demo";
}

export function setStoredAuthMode(mode: AuthMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
}
