import { crmApiBaseUrl } from "@/lib/api/config";
import { clearCrmSession, getCrmAccessToken, getCrmOrganization } from "@/lib/api/crm-session";
import { reportSystemApiError } from "@/stores/system-error-store";
import { useAuthStore } from "@/stores/auth-store";

export class CrmApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CrmApiError";
  }
}

/** Xóa JWT + user Zustand rồi về `/login` (có basePath Pages nếu có). */
function redirectToLoginAfterUnauthorized() {
  clearCrmSession();
  useAuthStore.getState().logout();
  if (typeof window === "undefined") return;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const target = `${base}/login` || "/login";
  if (window.location.pathname.replace(/\/$/, "") === target.replace(/\/$/, "")) return;
  window.location.replace(target);
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  if ("message" in body && typeof (body as { message: unknown }).message === "string") {
    const msg = (body as { message: string }).message.trim();
    if (msg) return msg;
  }
  if ("errors" in body && (body as { errors: unknown }).errors && typeof (body as { errors: unknown }).errors === "object") {
    const errors = (body as { errors: Record<string, unknown> }).errors;
    for (const value of Object.values(errors)) {
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
        return value[0].trim();
      }
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

function throwCrmError(status: number, body: unknown): never {
  const msg = messageFromBody(body) || "fail";
  reportSystemApiError(status, msg);
  throw new CrmApiError(msg, status);
}

export type CrmFetchInit = RequestInit & {
  /** Không mở popup lỗi toàn app (vd. refresh nền). */
  silentError?: boolean;
};

/** Fetch JSON tới /crm/{org}/… với Bearer. 401 / thiếu session → login. */
export async function crmFetch<T>(
  path: string,
  init: CrmFetchInit = {},
): Promise<T> {
  const { silentError, ...req } = init;
  const org = getCrmOrganization();
  const token = getCrmAccessToken();
  if (!org || !token) {
    redirectToLoginAfterUnauthorized();
    throw new CrmApiError("unauthorized", 401);
  }

  const url = `${crmApiBaseUrl()}/crm/${org.id}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...req,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(req.headers ?? {}),
      },
    });
  } catch {
    if (!silentError) reportSystemApiError(0, "network");
    throw new CrmApiError("network", 0);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401) {
    redirectToLoginAfterUnauthorized();
    throw new CrmApiError("unauthorized", 401);
  }

  if (!res.ok) {
    const msg = messageFromBody(body) || "fail";
    if (!silentError) reportSystemApiError(res.status, msg);
    throw new CrmApiError(msg, res.status);
  }

  return body as T;
}

/** Multipart upload (không set Content-Type JSON). 401 → login. */
export async function crmUpload<T>(path: string, form: FormData): Promise<T> {
  const org = getCrmOrganization();
  const token = getCrmAccessToken();
  if (!org || !token) {
    redirectToLoginAfterUnauthorized();
    throw new CrmApiError("unauthorized", 401);
  }

  const url = `${crmApiBaseUrl()}/crm/${org.id}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  } catch {
    reportSystemApiError(0, "network");
    throw new CrmApiError("network", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401) {
    redirectToLoginAfterUnauthorized();
    throw new CrmApiError("unauthorized", 401);
  }

  if (!res.ok) {
    throwCrmError(res.status, body);
  }

  return body as T;
}
