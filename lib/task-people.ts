/** Chuẩn hóa người phụ trách: list mới, fallback cột đơn. */
export function taskAssigneeIds(task: { assigneeId?: string; assigneeIds?: string[] } | null | undefined): string[] {
  const ids = (task?.assigneeIds ?? []).map((id) => String(id).trim()).filter(Boolean);
  if (ids.length > 0) return [...new Set(ids)];
  const one = String(task?.assigneeId ?? "").trim();
  return one ? [one] : [];
}

export function taskMatchesAssigneeFilter(
  task: { assigneeId?: string; assigneeIds?: string[] },
  selected: string[],
  unassignedKey = "",
) {
  if (selected.length === 0) return true;
  const ids = taskAssigneeIds(task);
  if (selected.includes(unassignedKey) && ids.length === 0) return true;
  return ids.some((id) => selected.includes(id));
}
