import { uid } from "@/lib/utils";
import type { StudioTask, TaskActivity, TaskActivityKind } from "@/types";

export function taskSnapshot(
  task: Pick<
    StudioTask,
    "title" | "status" | "priority" | "assigneeId" | "assigneeIds" | "verifierId" | "branchId" | "parentId" | "dueDay" | "note" | "noteImageUrls"
  >,
) {
  const ids = [...new Set((task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : [])).filter(Boolean))].sort();
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee_ids: ids.join(","),
    verifier_id: task.verifierId || "",
    branch_id: task.branchId || "",
    parent_id: task.parentId || "",
    due_day: task.dueDay,
    note: task.note ?? "",
    note_image_urls: (task.noteImageUrls ?? []).join(","),
  };
}

export function makeActivity(input: {
  kind: TaskActivityKind;
  actorId?: string;
  field?: string;
  fromValue?: string;
  toValue?: string;
  text?: string;
}): TaskActivity {
  return {
    id: uid("ta"),
    kind: input.kind,
    field: input.field ?? "",
    fromValue: input.fromValue ?? "",
    toValue: input.toValue ?? "",
    text: input.text ?? "",
    actorId: input.actorId ?? "",
    at: new Date().toISOString(),
  };
}

export function diffActivities(
  before: ReturnType<typeof taskSnapshot>,
  after: ReturnType<typeof taskSnapshot>,
  actorId?: string,
): TaskActivity[] {
  const rows: TaskActivity[] = [];
  for (const field of Object.keys(after) as (keyof typeof after)[]) {
    if (before[field] === after[field]) continue;
    rows.push(makeActivity({ kind: "field", actorId, field, fromValue: before[field], toValue: after[field] }));
  }
  return rows;
}

export function existingActivity(task: Pick<StudioTask, "comments" | "activity">): TaskActivity[] {
  if (task.activity && task.activity.length > 0) return [...task.activity];
  return (task.comments ?? []).map((c) => ({
    id: `c-${c.id}`,
    kind: "comment" as const,
    field: "",
    fromValue: "",
    toValue: "",
    text: c.text,
    imageUrl: c.imageUrls?.[0] ?? c.imageUrl,
    imageUrls: c.imageUrls?.length ? c.imageUrls : c.imageUrl ? [c.imageUrl] : undefined,
    actorId: c.actorId,
    at: c.at || `${c.day}T00:00:00Z`,
  }));
}

export function mergeTaskActivity(task: Pick<StudioTask, "comments" | "activity">): TaskActivity[] {
  return existingActivity(task).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}
