import { crmFetch, type CrmFetchInit } from "@/lib/api/crm-client";
import type { RoleAccess, TaskAccess } from "@/types";

export type MaRoleAccessRow = {
  id: string;
  items: Record<string, boolean>;
  tabs: Record<string, boolean>;
  tasks: TaskAccess;
};

/** GET /crm/{org}/access */
export async function fetchMaAccessMatrix(opts?: Pick<CrmFetchInit, "silentError">): Promise<MaRoleAccessRow[]> {
  const res = await crmFetch<{ data: MaRoleAccessRow[] }>("/access", {
    silentError: opts?.silentError,
  });
  return res.data ?? [];
}

/** PUT /crm/{org}/access — Boss only. */
export async function putMaAccessMatrix(rows: RoleAccess[]): Promise<MaRoleAccessRow[]> {
  const res = await crmFetch<{ data: MaRoleAccessRow[] }>("/access", {
    method: "PUT",
    body: JSON.stringify({
      data: rows.map((row) => ({
        id: row.id,
        items: row.items,
        tabs: row.tabs,
        tasks: row.tasks,
      })),
    }),
  });
  return res.data ?? [];
}
