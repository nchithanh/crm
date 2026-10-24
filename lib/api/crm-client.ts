import { crmApiBaseUrl } from "@/lib/api/config";
import { clearCrmSession, getCrmAccessToken, getCrmOrganization } from "@/lib/api/crm-session";

export class CrmApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CrmApiError";
  }
}

/** Fetch JSON tới /crm/{org}/… với Bearer. 401 → clear session. */
export async function crmFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const org = getCrmOrganization();
  const token = getCrmAccessToken();
  if (!org || !token) {
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
    clearCrmSession();
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
