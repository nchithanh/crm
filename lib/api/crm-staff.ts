import { crmFetch } from "@/lib/api/crm-client";
import type { Role } from "@/types";

export const MA_CREATABLE_ROLES: Role[] = ["owner", "reception", "teacher", "marketing", "accountant"];

export type MaStaff = {
  id: string;
  name: string;
  username: string;
  role: Role;
  status: "active" | "inactive";
  branchId: string;
  avatarColor: string;
};

type ApiStaff = {
  id: number;
  name: string;
  username: string;
  role: string;
  status?: string;
  branch_id?: number;
  avatar_color?: string;
};

function mapRole(role: string): Role {
  return (["boss", "owner", "reception", "teacher", "marketing", "accountant"] as const).includes(role as Role)
    ? (role as Role)
    : "owner";
}

export function mapMaStaff(s: ApiStaff): MaStaff {
  return {
    id: String(s.id),
    name: s.name,
    username: s.username,
    role: mapRole(s.role),
    status: s.status === "inactive" ? "inactive" : "active",
    branchId: s.branch_id && s.branch_id > 0 ? String(s.branch_id) : "",
    avatarColor: s.avatar_color?.trim() || "#6554C0",
  };
}

export async function fetchMaStaffAll(): Promise<MaStaff[]> {
  const res = await crmFetch<{ data: ApiStaff[] }>("/staff?all=1");
  return (res.data ?? []).map(mapMaStaff);
}

export async function apiCreateStaff(input: {
  username: string;
  password: string;
  name?: string;
  role: Role;
  branchId?: string;
}): Promise<MaStaff> {
  const res = await crmFetch<{ data: ApiStaff }>("/staff", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      name: input.name ?? "",
      role: input.role,
      branch_id: input.branchId ? Number(input.branchId) : 0,
    }),
  });
  return mapMaStaff(res.data);
}

export async function apiUpdateStaff(input: {
  id: string;
  name?: string;
  role?: Role;
  branchId?: string;
  status?: "active" | "inactive";
}): Promise<MaStaff> {
  const body: Record<string, string | number> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.role !== undefined) body.role = input.role;
  if (input.branchId !== undefined) body.branch_id = input.branchId ? Number(input.branchId) : 0;
  if (input.status !== undefined) body.status = input.status;

  const res = await crmFetch<{ data: ApiStaff }>(`/staff/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapMaStaff(res.data);
}

export async function apiUpdateStaffPassword(id: string, password: string): Promise<MaStaff> {
  const res = await crmFetch<{ data: ApiStaff }>(`/staff/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
  return mapMaStaff(res.data);
}

/** Soft-delete → inactive. */
export async function apiDeactivateStaff(id: string): Promise<MaStaff> {
  const res = await crmFetch<{ data: ApiStaff }>(`/staff/${id}`, { method: "DELETE" });
  return mapMaStaff(res.data);
}

export function staffShareText(input: {
  studio: string;
  name: string;
  username: string;
  password: string;
  roleLabel: string;
}): string {
  return [
    `Dolphin CRM — ${input.studio}`,
    `Tên: ${input.name}`,
    `Vai trò: ${input.roleLabel}`,
    `Username: ${input.username}`,
    `Mật khẩu: ${input.password}`,
  ].join("\n");
}

export async function shareStaffCredentials(text: string, title: string): Promise<"shared" | "copied" | "fail"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "fail";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "fail";
  }
}
