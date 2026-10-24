import type { CrmLoginResponse } from "@/lib/api/crm-auth";

const TOKEN_KEY = "dolphin-crm-access-token";
const ORG_KEY = "dolphin-crm-organization";

export type CrmOrgSession = {
  id: number;
  code: string;
  name: string;
};

export function saveCrmSession(data: CrmLoginResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(
    ORG_KEY,
    JSON.stringify({
      id: data.organization.id,
      code: data.organization.code,
      name: data.organization.name,
    } satisfies CrmOrgSession),
  );
}

export function clearCrmSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORG_KEY);
}

export function getCrmAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCrmOrganization(): CrmOrgSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrmOrgSession;
  } catch {
    return null;
  }
}
