import { crmApiBaseUrl } from "@/lib/api/config";
import type { Role } from "@/types";

export type CrmLoginResponse = {
  access_token: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    username: string;
    phone?: string;
    avatar_color?: string;
    role: string;
  };
  organization: {
    id: number;
    code: string;
    name: string;
  };
};

const CRM_ROLES: Role[] = ["boss", "owner", "reception", "teacher", "marketing", "accountant"];

export function mapCrmRole(role: string): Role {
  const r = role.toLowerCase();
  if (CRM_ROLES.includes(r as Role)) return r as Role;
  if (r === "manager") return "owner";
  if (r === "cashier") return "reception";
  return "owner";
}

/** POST /crm/login — lỗi mạng hoặc non-OK → throw Error(message | bad-credentials). */
export async function crmLogin(username: string, password: string): Promise<CrmLoginResponse> {
  const url = `${crmApiBaseUrl()}/crm/login`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
  } catch {
    throw new Error("network");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error("bad-credentials");
    const msg =
      body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "fail";
    throw new Error(msg || "fail");
  }

  return body as CrmLoginResponse;
}
