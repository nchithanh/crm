import { crmFetch } from "@/lib/api/crm-client";
import type { StudioTask, TaskComment, TaskParent, TaskPriority, TaskStatus, User } from "@/types";

type ApiTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_id: number;
  verifier_id?: number;
  branch_id: number;
  parent_id: number;
  due_day: string;
  note: string;
  created_by?: number;
  comments?: ApiComment[];
};

type ApiComment = {
  id: number;
  task_id: number;
  actor_id: number;
  day: string;
  text: string;
};

type ApiParent = { id: number; name: string; sort?: number; status?: string };
type ApiStaff = { id: number; name: string; username: string; role: string; avatar_color?: string; phone?: string };
type ApiBranch = {
  id: number;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  check_in_radius_m: number;
};

function mapComment(c: ApiComment): TaskComment {
  return {
    id: String(c.id),
    day: c.day,
    actorId: String(c.actor_id || ""),
    text: c.text,
  };
}

export function mapApiTask(t: ApiTask): StudioTask {
  return {
    id: String(t.id),
    title: t.title,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    assigneeId: t.assignee_id > 0 ? String(t.assignee_id) : "",
    verifierId: t.verifier_id && t.verifier_id > 0 ? String(t.verifier_id) : "",
    branchId: t.branch_id > 0 ? String(t.branch_id) : "",
    parentId: t.parent_id > 0 ? String(t.parent_id) : "",
    dueDay: t.due_day,
    note: t.note ?? "",
    comments: (t.comments ?? []).map(mapComment),
  };
}

export function mapApiParent(p: ApiParent): TaskParent {
  return { id: String(p.id), name: p.name };
}

export function mapApiStaff(s: ApiStaff): User {
  const role = (["boss", "owner", "reception", "teacher", "marketing", "accountant"] as const).includes(
    s.role as User["role"],
  )
    ? (s.role as User["role"])
    : "owner";
  return {
    id: String(s.id),
    name: s.name,
    email: s.username,
    phone: s.phone ?? "",
    role,
    pin: "",
    avatarColor: s.avatar_color?.trim() || "#6554C0",
  };
}

export type MaBranch = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  checkInRadiusM?: number;
};

export function mapApiBranch(b: ApiBranch): MaBranch {
  return {
    id: String(b.id),
    name: b.name,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    checkInRadiusM: b.check_in_radius_m,
  };
}

export async function fetchMaTasks(): Promise<StudioTask[]> {
  const res = await crmFetch<{ data: ApiTask[] }>("/tasks");
  return (res.data ?? []).map(mapApiTask);
}

export async function fetchMaTask(id: string): Promise<StudioTask> {
  const res = await crmFetch<{ data: ApiTask }>(`/tasks/${id}`);
  return mapApiTask(res.data);
}

export async function fetchMaParents(): Promise<TaskParent[]> {
  const res = await crmFetch<{ data: ApiParent[] }>("/task-parents");
  return (res.data ?? []).map(mapApiParent);
}

export async function fetchMaStaff(): Promise<User[]> {
  const res = await crmFetch<{ data: ApiStaff[] }>("/staff");
  return (res.data ?? []).map(mapApiStaff);
}

export async function fetchMaBranches(): Promise<MaBranch[]> {
  const res = await crmFetch<{ data: ApiBranch[] }>("/branches");
  return (res.data ?? []).map(mapApiBranch);
}

export async function apiCreateParent(name: string): Promise<TaskParent> {
  const res = await crmFetch<{ data: ApiParent }>("/task-parents", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return mapApiParent(res.data);
}

export async function apiUpdateParent(id: string, name: string): Promise<TaskParent> {
  const res = await crmFetch<{ data: ApiParent }>(`/task-parents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return mapApiParent(res.data);
}

export async function apiDeleteParent(id: string): Promise<void> {
  await crmFetch(`/task-parents/${id}`, { method: "DELETE" });
}

export async function apiCreateTask(input: {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  verifierId?: string;
  branchId?: string;
  parentId?: string;
  dueDay?: string;
  note?: string;
}): Promise<StudioTask> {
  const res = await crmFetch<{ data: ApiTask }>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId ? Number(input.assigneeId) : 0,
      verifier_id: input.verifierId ? Number(input.verifierId) : 0,
      branch_id: input.branchId ? Number(input.branchId) : 0,
      parent_id: input.parentId ? Number(input.parentId) : 0,
      due_day: input.dueDay,
      note: input.note ?? "",
    }),
  });
  return mapApiTask(res.data);
}

export async function apiUpdateTask(input: {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  verifierId: string;
  branchId: string;
  parentId: string;
  dueDay: string;
  note: string;
}): Promise<StudioTask> {
  const res = await crmFetch<{ data: ApiTask }>(`/tasks/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId ? Number(input.assigneeId) : 0,
      verifier_id: input.verifierId ? Number(input.verifierId) : 0,
      branch_id: input.branchId ? Number(input.branchId) : 0,
      parent_id: input.parentId ? Number(input.parentId) : 0,
      due_day: input.dueDay,
      note: input.note,
    }),
  });
  return mapApiTask(res.data);
}

export async function apiMoveTaskStatus(id: string, status: TaskStatus): Promise<StudioTask> {
  const res = await crmFetch<{ data: ApiTask }>(`/tasks/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapApiTask(res.data);
}

export async function apiAddComment(taskId: string, text: string): Promise<TaskComment> {
  const res = await crmFetch<{ data: ApiComment }>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return mapComment(res.data);
}
