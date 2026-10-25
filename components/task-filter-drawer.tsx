"use client";

import { X } from "lucide-react";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { FilterGroup, filterColorOf, type FilterRowDef } from "@/components/filter-checklist";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { taskPriorities, taskPriorityLabel, taskStatusLabel, taskStatuses } from "@/lib/labels";
import { localDayKey } from "@/lib/utils";
import type { StudioTask, TaskParent, TaskPriority, TaskStatus, User } from "@/types";

export const TASK_FILTER_NONE_PARENT = "__none__";
export const TASK_FILTER_UNASSIGNED = "";

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#64748b",
  inprogress: "#0ea5e9",
  verify: "#5d5cc4",
  feedback: "#f59e0b",
  done: "#10b981",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#64748b",
};

export type TaskFilterSelection = {
  assignees: string[];
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  parents: string[];
  overdueOnly: boolean;
};

export function emptyTaskFilter(): TaskFilterSelection {
  return { assignees: [], statuses: [], priorities: [], parents: [], overdueOnly: false };
}

export function taskFilterGroupCount(s: TaskFilterSelection) {
  return (s.assignees.length ? 1 : 0) + (s.statuses.length ? 1 : 0) + (s.priorities.length ? 1 : 0) + (s.parents.length ? 1 : 0) + (s.overdueOnly ? 1 : 0);
}

export function TaskFilterDrawer({
  tasks,
  staff,
  parents,
  selection,
  onToggle,
  onToggleOverdue,
  onClear,
  onClose,
  visibleCount,
}: {
  tasks: StudioTask[];
  staff: User[];
  parents: TaskParent[];
  selection: TaskFilterSelection;
  onToggle: (group: keyof Omit<TaskFilterSelection, "overdueOnly">, id: string) => void;
  onToggleOverdue: () => void;
  onClear: () => void;
  onClose: () => void;
  visibleCount: number;
}) {
  const { lang, t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  const countBy = (fn: (row: StudioTask) => string) => {
    const map = new Map<string, number>();
    for (const row of tasks) {
      const key = fn(row);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const assigneeCounts = countBy((row) => row.assigneeId || TASK_FILTER_UNASSIGNED);
  const statusCounts = countBy((row) => row.status);
  const priorityCounts = countBy((row) => row.priority);
  const parentCounts = countBy((row) => row.parentId || TASK_FILTER_NONE_PARENT);
  const overdueCount = tasks.filter((row) => row.status !== "done" && row.dueDay < localDayKey()).length;
  const hasAny = taskFilterGroupCount(selection) > 0;

  const assigneeRows: FilterRowDef[] = [
    {
      key: "unassigned",
      label: t.task.unassigned,
      count: assigneeCounts.get(TASK_FILTER_UNASSIGNED) ?? 0,
      color: "#94a3b8",
      checked: selection.assignees.includes(TASK_FILTER_UNASSIGNED),
      onToggle: () => onToggle("assignees", TASK_FILTER_UNASSIGNED),
    },
    ...staff.map((u) => ({
      key: u.id,
      label: u.name,
      count: assigneeCounts.get(u.id) ?? 0,
      color: u.avatarColor || filterColorOf(u.id),
      checked: selection.assignees.includes(u.id),
      onToggle: () => onToggle("assignees", u.id),
    })),
  ];
  const statusRows: FilterRowDef[] = taskStatuses(lang).map((s) => ({
    key: s.id,
    label: taskStatusLabel(s.id, lang),
    count: statusCounts.get(s.id) ?? 0,
    color: STATUS_COLORS[s.id],
    checked: selection.statuses.includes(s.id),
    onToggle: () => onToggle("statuses", s.id),
  }));
  const priorityRows: FilterRowDef[] = taskPriorities(lang).map((p) => ({
    key: p.id,
    label: taskPriorityLabel(p.id, lang),
    count: priorityCounts.get(p.id) ?? 0,
    color: PRIORITY_COLORS[p.id],
    checked: selection.priorities.includes(p.id),
    onToggle: () => onToggle("priorities", p.id),
  }));
  const parentRows: FilterRowDef[] = [
    {
      key: TASK_FILTER_NONE_PARENT,
      label: t.task.noParent,
      count: parentCounts.get(TASK_FILTER_NONE_PARENT) ?? 0,
      color: "#94a3b8",
      checked: selection.parents.includes(TASK_FILTER_NONE_PARENT),
      onToggle: () => onToggle("parents", TASK_FILTER_NONE_PARENT),
    },
    ...parents.map((p) => ({
      key: p.id,
      label: p.name,
      count: parentCounts.get(p.id) ?? 0,
      color: filterColorOf(p.id),
      checked: selection.parents.includes(p.id),
      onToggle: () => onToggle("parents", p.id),
    })),
  ];
  const overdueRows: FilterRowDef[] = [
    {
      key: "overdue",
      label: t.task.overdueOnly,
      count: overdueCount,
      color: "#ef4444",
      checked: selection.overdueOnly,
      onToggle: onToggleOverdue,
    },
  ];

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-w-md overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <h2 className="crm-section-title text-lg">{t.task.filterTitle}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onClear} disabled={!hasAny} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)] disabled:opacity-40">
            {t.task.filterClear}
          </button>
          <button type="button" onClick={requestClose} aria-label={t.common.close} className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--brand-50)] hover:text-[var(--foreground)]">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        <FilterGroup title={t.task.assignee} sections={[{ rows: assigneeRows }]} />
        <FilterGroup title={t.task.status} sections={[{ rows: statusRows }]} />
        <FilterGroup title={t.task.priority} sections={[{ rows: priorityRows }]} />
        <FilterGroup title={t.task.parent} sections={[{ rows: parentRows }]} />
        <FilterGroup title={t.status.overdue} sections={[{ rows: overdueRows }]} />
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
        <p className="text-center text-xs text-[var(--muted)]">{fill(t.task.filterShowing, { v: visibleCount, t: tasks.length })}</p>
      </div>
    </CrmDrawerShell>
  );
}
