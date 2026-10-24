/** Base URL API backend (không slash cuối). Dev mặc định nginx Docker :8080. */
export function crmApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_CRM_API_URL ?? "http://localhost:8080").trim();
  return raw.replace(/\/+$/, "");
}
