import { crmApiBaseUrl } from "@/lib/api/config";
import { clearCrmSession, getCrmAccessToken, getCrmOrganization } from "@/lib/api/crm-session";
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

/** Fetch JSON tới /crm/{org}/… với Bearer. 401 / thiếu session → login. */
export async function crmFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
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
    const msg =
      body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "fail";
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
    const msg =
      body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "fail";
    throw new CrmApiError(msg, res.status);
  }

  return body as T;
}
