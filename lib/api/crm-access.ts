import { crmFetch, type CrmFetchInit } from "@/lib/api/crm-client";
import type { RoleAccess } from "@/types";

/** Hàng ma trận từ API — cùng shape `RoleAccess` (`id: Role`, Boss không lưu). */
export type MaRoleAccessRow = RoleAccess;

/** GET /crm/{org}/access */
export async function fetchMaAccessMatrix(opts?: Pick<CrmFetchInit, "silentError">): Promise<RoleAccess[]> {
  const res = await crmFetch<{ data: RoleAccess[] }>("/access", {
    silentError: opts?.silentError,
  });
  return res.data ?? [];
}

/** PUT /crm/{org}/access — Boss only. */
export async function putMaAccessMatrix(rows: RoleAccess[]): Promise<RoleAccess[]> {
  const res = await crmFetch<{ data: RoleAccess[] }>("/access", {
    method: "PUT",
    body: JSON.stringify({
      data: rows.map((row) => ({
        id: row.id,
        items: row.items,
        tabs: row.tabs,
        tasks: row.tasks,
        courses: row.courses,
      })),
    }),
  });
  return res.data ?? [];
}
