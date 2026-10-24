import { crmFetch } from "@/lib/api/crm-client";

export type CrmProfile = {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatarColor: string;
  role: string;
  status: string;
  branchId: string;
};

type ApiProfile = {
  id: number;
  name: string;
  username: string;
  phone?: string;
  avatar_color?: string;
  role: string;
  status?: string;
  branch_id?: number;
};

function mapProfile(p: ApiProfile): CrmProfile {
  return {
    id: String(p.id),
    name: p.name,
    username: p.username,
    phone: p.phone ?? "",
    avatarColor: p.avatar_color?.trim() || "#6554C0",
    role: p.role,
    status: p.status ?? "active",
    branchId: p.branch_id && p.branch_id > 0 ? String(p.branch_id) : "",
  };
}

export async function fetchMyProfile(): Promise<CrmProfile> {
  const res = await crmFetch<{ data: ApiProfile }>("/me");
  return mapProfile(res.data);
}

export async function updateMyProfile(input: { name: string; phone: string }): Promise<CrmProfile> {
  const res = await crmFetch<{ data: ApiProfile }>("/me", {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name.trim(),
      phone: input.phone.trim(),
    }),
  });
  return mapProfile(res.data);
}
