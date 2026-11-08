"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, FolderKanban, ImagePlus, ListFilter, Search, ShieldAlert } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, Skeleton, Spinner, inputClass } from "@/components/ui";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { TaskImageGallery } from "@/components/task-image-gallery";
import {
  TASK_FILTER_NONE_PARENT,
  TaskFilterDrawer,
  emptyTaskFilter,
  taskFilterGroupCount,
  type TaskFilterSelection,
} from "@/components/task-filter-drawer";
import { filterColorOf } from "@/components/filter-checklist";
import { ParentChip, TaskParentDrawer } from "@/components/task-parent-drawer";
import {
  canChangeTaskStatus,
  canCommentTask,
  canCreateTasks,
  canEditTaskFields,
  canManageTaskParents,
  canMarkTaskDone,
  canSeeAllTasks,
  canTouchTask,
  isMaStudioMode,
} from "@/lib/access";
import { mergeTaskActivity } from "@/lib/task-activity";
import { taskAssigneeIds, taskMatchesAssigneeFilter } from "@/lib/task-people";
import { addTaskComment, createTask, createTaskParent, moveTaskStatus, updateTask } from "@/lib/actions";
import { apiUploadMedia, fetchMaTask } from "@/lib/api/crm-tasks";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useMaTasksData } from "@/lib/hooks/use-ma-tasks-data";
import { useI18n } from "@/lib/i18n";
import { taskDueClass, taskPriorities, taskPriorityClass, taskPriorityLabel, taskStatusClass, taskStatusLabel, taskStatuses } from "@/lib/labels";
import { cn, initials, localDayKey, zaloHref } from "@/lib/utils";
import { useAccessStore } from "@/stores/access-store";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { StudioTask, TaskParent, TaskPriority, TaskStatus, User } from "@/types";

type Mode = "list" | "board";

function addDays(base: string, delta: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

function dueTone(status: TaskStatus, dueDay: string, today: string, soonDay: string) {
  if (status === "done") return "text-slate-400";
  if (dueDay < today) return "font-semibold text-rose-600";
  if (dueDay <= soonDay) return "font-semibold text-amber-600";
  return "text-slate-600";
}

function AssigneeFaces({
  ids,
  staff,
  emptyLabel,
  moreLabel,
}: {
  ids: string[];
  staff: User[];
  emptyLabel: string;
  moreLabel: (n: number) => string;
}) {
  const people = ids.map((id) => staff.find((u) => u.id === id)).filter((u): u is User => Boolean(u));
  if (people.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">—</span>
        <span className="truncate text-xs">{emptyLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-slate-600">
      <span className="flex shrink-0 -space-x-1.5">
        {people.slice(0, 3).map((person) => (
          <span
            key={person.id}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
            style={{ background: person.avatarColor }}
          >
            {initials(person.name)}
          </span>
        ))}
      </span>
      <span className="truncate text-xs">
        {people[0].name}
        {people.length > 1 ? ` ${moreLabel(people.length - 1)}` : ""}
      </span>
    </span>
  );
}

export default function TasksPage() {
  const { lang, t } = useI18n();
  const me = useAuthStore((s) => s.user);
  const accessRev = useAccessStore((s) => s.revision);
  const canCreate = canCreateTasks(me?.role);
  const canEditParents = canManageTaskParents(me?.role);
  const seeAll = canSeeAllTasks(me?.role);
  const allowStatus = canChangeTaskStatus(me?.role);
  const allowComment = canCommentTask(me?.role);
  void accessRev;
  const maMode = isMaStudioMode();
  const ma = useMaTasksData(maMode);
  const dexieTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const dexieParents = useLiveQuery(() => db.taskParents.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const dexieBranches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId: studioBranch } = useStudioBranch();
  const rawTasks = maMode ? ma.tasks : dexieTasks;
  const tasks = seeAll || maMode
    ? rawTasks
    : rawTasks.filter((task) => canTouchTask(me?.role, task, me?.id));
  const parents = maMode ? ma.parents : dexieParents;
  const branches = maMode ? ma.branches : dexieBranches;
  const staff = maMode
    ? ma.staff.filter(
        (u) =>
          u.role === "boss" ||
          u.role === "owner" ||
          u.role === "reception" ||
          u.role === "teacher" ||
          u.role === "marketing" ||
          u.role === "accountant",
      )
    : users.filter((u) => u.role === "owner" || u.role === "reception" || u.role === "teacher" || u.role === "accountant");
  /** Chip filter user — cùng scope xem task (boss/owner = all). */
  const filterStaff = useMemo(() => {
    if (seeAll) return staff;
    const ids = new Set<string>();
    if (me?.id) ids.add(me.id);
    for (const task of tasks) {
      for (const id of taskAssigneeIds(task)) ids.add(id);
      if (task.verifierId) ids.add(task.verifierId);
    }
    return staff.filter((u) => ids.has(u.id));
  }, [seeAll, staff, tasks, me?.id]);
  const today = localDayKey();
  const soonDay = addDays(today, 2);
  const statuses = taskStatuses(lang);

  const [mode, setMode] = useState<Mode>("board");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<TaskFilterSelection>(emptyTaskFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState("");

  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parents) map.set(p.id, p.name);
    return map;
  }, [parents]);

  const branchTasks = useMemo(
    () => tasks.filter((task) => studioBranch === "all" || !task.branchId || task.branchId === studioBranch),
    [tasks, studioBranch],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return branchTasks
      .filter((task) => {
        if (!taskMatchesAssigneeFilter(task, filters.assignees)) return false;
        if (needle && !task.title.toLowerCase().includes(needle)) return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
        if (filters.parents.length > 0) {
          const parentKey = task.parentId || TASK_FILTER_NONE_PARENT;
          if (!filters.parents.includes(parentKey)) return false;
        }
        if (filters.overdueOnly && !(task.status !== "done" && task.dueDay < today)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.dueDay !== b.dueDay) return a.dueDay.localeCompare(b.dueDay);
        return a.title.localeCompare(b.title);
      });
  }, [branchTasks, q, filters, today]);

  const parentProgress = useMemo(() => {
    const source = branchTasks.filter((task) => {
      if (!taskMatchesAssigneeFilter(task, filters.assignees)) return false;
      return Boolean(task.parentId);
    });
    return parents
      .map((parent) => {
        const rows = source.filter((task) => task.parentId === parent.id);
        const done = rows.filter((task) => task.status === "done").length;
        const openRows = rows.filter((task) => task.status !== "done");
        const pool = openRows.length ? openRows : rows;
        const earliest = pool.map((task) => task.dueDay).sort()[0] ?? "";
        return { id: parent.id, name: parent.name, total: rows.length, done, earliest };
      });
  }, [branchTasks, parents, filters.assignees]);

  const filterCount = taskFilterGroupCount(filters);
  const columns = statuses;

  function toggleFilter(group: keyof Omit<TaskFilterSelection, "overdueOnly">, id: string) {
    setFilters((cur) => {
      const list = cur[group] as string[];
      const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
      return { ...cur, [group]: next };
    });
  }

  const open = tasks.find((task) => task.id === openId) ?? null;

  function branchName(id: string) {
    if (!id) return "—";
    return branches.find((b) => b.id === id)?.name ?? id;
  }

  function parentName(id: string) {
    if (!id) return "";
    return parentMap.get(id) ?? id;
  }

  async function onDrop(status: TaskStatus, taskId: string) {
    const task = tasks.find((row) => row.id === taskId);
    if (!task || task.status === status || movingId) return;
    if (!allowStatus || !canTouchTask(me?.role, task, me?.id)) return;
    if (status === "done" && !canMarkTaskDone(me?.role, task, me?.id)) {
      setStatusHint(t.task.doneBlocked);
      return;
    }
    setStatusHint("");
    setMovingId(taskId);
    try {
      await moveTaskStatus(taskId, status, me?.id);
      if (maMode) await ma.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setStatusHint(msg && msg !== "fail" ? msg : t.task.doneBlocked);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.task.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.task.subtitle}</p>
          {maMode && ma.loading && tasks.length > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Spinner className="text-[var(--brand-500)]" /> {t.common.loading}
            </p>
          ) : null}
          {maMode && ma.error ? <p className="mt-1 text-xs text-rose-600">{ma.error}</p> : null}
          {!canCreate && !allowStatus && !allowComment ? (
            <p className="mt-1 text-xs text-slate-400">{t.task.viewOnly}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "list" ? "primary" : "outline"} onClick={() => setMode("list")}>
            {t.task.list}
          </Button>
          <Button type="button" variant={mode === "board" ? "primary" : "outline"} onClick={() => setMode("board")}>
            {t.task.board}
          </Button>
          {canEditParents ? (
            <Button type="button" variant="outline" onClick={() => { setParentOpen(true); setFilterOpen(false); }}>
              <FolderKanban size={16} />
              {t.task.parentManage}
            </Button>
          ) : null}
          {canCreate ? (
            <Button type="button" onClick={() => { setCreating(true); setOpenId(null); }}>
              {t.task.create}
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
        role="note"
      >
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{t.task.doneBadge}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90">{t.task.doneOnlyBossVerifier}</p>
        </div>
      </div>
      {statusHint ? (
        <div
          className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="font-medium">{statusHint}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 sm:max-w-xs sm:flex-none">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden />
          <input
            className="h-9 min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none"
            placeholder={t.task.search}
            aria-label={t.task.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <span className="relative">
          <Button type="button" variant="outline" onClick={() => setFilterOpen(true)}>
            <ListFilter size={16} />
            {t.task.filter}
          </Button>
          {filterCount ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-500)] px-1 text-[11px] font-bold text-white tabular-nums">{filterCount}</span>
          ) : null}
        </span>
      </div>

      {maMode && ma.loading && tasks.length === 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-busy aria-label={t.common.loading}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
              <Skeleton className="h-5 w-[66%]" />
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : parents.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {parents.map((parent) => {
            const group = parentProgress.find((row) => row.id === parent.id);
            const total = group?.total ?? 0;
            const done = group?.done ?? 0;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const on = filters.parents.includes(parent.id);
            return (
              <button
                key={parent.id}
                type="button"
                onClick={() => toggleFilter("parents", parent.id)}
                className={cn(
                  "rounded-xl border bg-[var(--card)] px-3 py-2.5 text-left",
                  on ? "border-[var(--brand-500)]" : "border-[var(--border)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <ParentChip id={parent.id} name={parent.name} />
                  <p className="text-xs tabular-nums text-slate-500">{fill(t.task.progressCount, { done, total })}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: filterColorOf(parent.id) }} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t.task.progress} · {pct}%
                  {group?.earliest ? ` · ${fill(t.task.earliestDue, { day: group.earliest })}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {maMode && ma.loading && tasks.length === 0 ? (
        mode === "list" ? (
          <Card className="mt-4 overflow-hidden" aria-busy aria-label={t.common.loading}>
            <div className="space-y-0 divide-y divide-slate-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-9 w-24 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="hidden h-4 w-20 sm:block" />
                  <Skeleton className="hidden h-7 w-16 rounded-full md:block" />
                  <Skeleton className="hidden h-4 w-24 lg:block" />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-busy aria-label={t.common.loading}>
            {Array.from({ length: 5 }).map((_, col) => (
              <section key={col} className="w-[272px] shrink-0 rounded-xl border border-[var(--border)] bg-slate-50 p-2">
                <div className="flex items-center justify-between px-2 py-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-5 w-8" />
                </div>
                <ul className="space-y-2">
                  {Array.from({ length: 3 }).map((_, row) => (
                    <li key={row} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="mt-2 h-5 w-16 rounded-full" />
                      <Skeleton className="mt-2 h-7 w-24 rounded-full" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{t.task.empty}</p>
      ) : mode === "list" ? (
        <Card className="mt-4 overflow-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left">
              <tr>
                {[t.task.status, t.task.titleField, t.task.parent, t.task.assignee, t.task.priority, t.task.due, t.common.branch].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => {
                const rows = visible.filter((task) => task.status === col.id);
                if (rows.length === 0) return null;
                return (
                <Fragment key={col.id}>
                {rows.map((task, index) => {
                const overdue = task.status !== "done" && task.dueDay < today;
                const soon = !overdue && task.status !== "done" && task.dueDay <= soonDay;
                const group = parentName(task.parentId);
                return (
                  <Fragment key={task.id}>
                  {index === 0 ? (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5", taskStatusClass(col.id))}>{col.label}</span>
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => { setOpenId(task.id); setCreating(false); }}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={cn("h-9 rounded-xl border px-2 text-sm font-semibold", taskStatusClass(task.status))}
                        value={task.status}
                        disabled={
                          Boolean(movingId) ||
                          !allowStatus ||
                          !canTouchTask(me?.role, task, me?.id)
                        }
                        aria-busy={movingId === task.id || undefined}
                        onChange={(e) => void onDrop(e.target.value as TaskStatus, task.id)}
                      >
                        {statuses.map((s) => {
                          const doneLocked =
                            s.id === "done" &&
                            task.status !== "done" &&
                            !canMarkTaskDone(me?.role, task, me?.id);
                          return (
                            <option key={s.id} value={s.id} disabled={doneLocked}>
                              {doneLocked ? t.task.doneLockedOption : s.label}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-[var(--brand-600)]">{task.title}</span>
                    </td>
                    <td className="px-3 py-3">
                      {task.parentId ? <ParentChip id={task.parentId} name={group} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <AssigneeFaces
                        ids={taskAssigneeIds(task)}
                        staff={staff}
                        emptyLabel={t.task.unassigned}
                        moreLabel={(n) => fill(t.task.assigneeMore, { n })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", taskPriorityClass(task.priority))}>
                        {taskPriorityLabel(task.priority, lang)}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 tabular-nums", dueTone(task.status, task.dueDay, today, soonDay))}>
                      {t.task.due}: {task.dueDay}
                      {overdue ? ` · ${t.pages.overdue}` : soon ? ` · ${t.task.dueSoon}` : ""}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{branchName(task.branchId)}</td>
                  </tr>
                  </Fragment>
                );
              })}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {columns.map((col) => {
            const rows = visible.filter((task) => task.status === col.id);
            return (
              <section
                key={col.id}
                className={cn(
                  "w-[272px] shrink-0 rounded-xl border bg-slate-50 p-2",
                  col.id === "done" ? "border-amber-300 ring-1 ring-amber-200/80" : "border-[var(--border)]",
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task");
                  if (id) void onDrop(col.id, id);
                }}
              >
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <div className="min-w-0">
                    <h2 className={cn("text-sm font-bold inline-flex rounded-full border px-2 py-0.5", taskStatusClass(col.id))}>
                      {col.label}
                    </h2>
                    {col.id === "done" ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        <ShieldAlert size={11} aria-hidden />
                        {t.task.doneBadge}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-xl bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{rows.length}</span>
                </div>
                <ul className="space-y-2">
                  {rows.map((task) => {
                    const overdue = task.status !== "done" && task.dueDay < today;
                    const soon = !overdue && task.status !== "done" && task.dueDay <= soonDay;
                    const movable = allowStatus && canTouchTask(me?.role, task, me?.id);
                    const group = parentName(task.parentId);
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          draggable={movable && !movingId}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/task", task.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => { setOpenId(task.id); setCreating(false); }}
                          className={cn(
                            "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left",
                            movingId === task.id && "opacity-60",
                          )}
                          aria-busy={movingId === task.id || undefined}
                        >
                          {task.parentId ? (
                            <p className="mb-1"><ParentChip id={task.parentId} name={group} /></p>
                          ) : null}
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            {movingId === task.id ? <Spinner className="text-[var(--brand-500)]" /> : null}
                            {task.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", taskPriorityClass(task.priority))}>
                              {taskPriorityLabel(task.priority, lang)}
                            </span>
                            <span className={cn("text-xs tabular-nums", dueTone(task.status, task.dueDay, today, soonDay))}>
                              {t.task.due}: {task.dueDay}{overdue ? ` · ${t.pages.overdue}` : soon ? ` · ${t.task.dueSoon}` : ""}
                            </span>
                          </div>
                          <div className="mt-2">
                            <AssigneeFaces
                              ids={taskAssigneeIds(task)}
                              staff={staff}
                              emptyLabel={t.task.unassigned}
                              moreLabel={(n) => fill(t.task.assigneeMore, { n })}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {parentOpen && canEditParents ? (
        <TaskParentDrawer
          parents={parents}
          tasks={branchTasks}
          canEdit={canEditParents}
          onClose={() => setParentOpen(false)}
          onChanged={() => { if (maMode) void ma.reload(); }}
        />
      ) : null}

      {filterOpen ? (
        <TaskFilterDrawer
          tasks={branchTasks}
          staff={filterStaff}
          parents={parents}
          selection={filters}
          onToggle={toggleFilter}
          onToggleOverdue={() => setFilters((cur) => ({ ...cur, overdueOnly: !cur.overdueOnly }))}
          onClear={() => setFilters(emptyTaskFilter())}
          onClose={() => setFilterOpen(false)}
          visibleCount={visible.length}
        />
      ) : null}

      {creating || open ? (
        <TaskDrawer
          task={creating ? undefined : open ?? undefined}
          staff={staff}
          branches={branches}
          parents={parents}
          me={me}
          canEditFields={
            creating
              ? canCreate
              : !!open && canEditTaskFields(me?.role, open, me?.id)
          }
          canChangeStatus={
            creating
              ? canCreate
              : !!open && allowStatus && canTouchTask(me?.role, open, me?.id)
          }
          canComment={allowComment}
          canEditParents={canEditParents}
          onClose={() => { setCreating(false); setOpenId(null); }}
          onMutated={() => { if (maMode) void ma.reload(); }}
        />
      ) : null}
    </div>
  );
}

function TaskDrawer({
  task,
  staff,
  branches,
  parents,
  me,
  canEditFields,
  canChangeStatus,
  canComment,
  canEditParents,
  onClose,
  onMutated,
}: {
  task?: StudioTask;
  staff: User[];
  branches: { id: string; name: string }[];
  parents: TaskParent[];
  me: User | null | undefined;
  canEditFields: boolean;
  canChangeStatus: boolean;
  canComment: boolean;
  canEditParents: boolean;
  onClose: () => void;
  onMutated?: () => void;
}) {
  const canSave = canEditFields || canChangeStatus;
  const { lang, t } = useI18n();
  const maMode = isMaStudioMode();
  const liveTask = useLiveQuery(
    () => (!maMode && task ? db.tasks.get(task.id) : undefined),
    [task?.id, maMode],
  );
  const [maDetail, setMaDetail] = useState(task);
  const [commentsLoading, setCommentsLoading] = useState(false);
  useEffect(() => {
    if (!maMode || !task?.id) {
      setMaDetail(task);
      setCommentsLoading(false);
      return;
    }
    let cancelled = false;
    setMaDetail(task);
    setCommentsLoading(true);
    void fetchMaTask(task.id)
      .then((row) => {
        if (!cancelled) setMaDetail(row);
      })
      .catch(() => {
        /* giữ snapshot list */
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [maMode, task?.id]);
  const current = maMode ? maDetail ?? task : liveTask ?? task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(() => taskAssigneeIds(task));
  const [verifierId, setVerifierId] = useState(task?.verifierId ?? "");
  const { branchId: studioBranch } = useStudioBranch();
  const [branchId, setBranchId] = useState(task?.branchId ?? (studioBranch !== "all" ? studioBranch : ""));
  const [parentId, setParentId] = useState(task?.parentId ?? "");
  const [dueDay, setDueDay] = useState(task?.dueDay ?? localDayKey());
  const [note, setNote] = useState(task?.note ?? "");
  const [noteImageUrls, setNoteImageUrls] = useState<string[]>(() => task?.noteImageUrls ?? []);
  const [notePendingFiles, setNotePendingFiles] = useState<File[]>([]);
  const [notePendingPreviews, setNotePendingPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!maDetail || !task?.id || maDetail.id !== task.id) return;
    // Detail fetch chủ yếu lấy comment; đồng bộ ảnh mô tả nếu list chưa có.
    setNoteImageUrls((prev) => (prev.length ? prev : maDetail.noteImageUrls ?? []));
  }, [maDetail, task?.id]);
  const [comment, setComment] = useState("");
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [parentError, setParentError] = useState("");
  const [addingParent, setAddingParent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentUploading, setCommentUploading] = useState(false);
  const [parentBusy, setParentBusy] = useState(false);
  const [activityTab, setActivityTab] = useState<"all" | "comment" | "history">("all");

  const firstAssigneeId = assigneeIds[0] ?? taskAssigneeIds(current)[0] ?? "";
  const assignee = staff.find((u) => u.id === firstAssigneeId);
  const phone = assignee?.phone?.trim() ?? "";
  const callHref = phone ? `tel:${phone.replace(/\s/g, "")}` : "";
  const zalo = phone ? zaloHref(phone) : "";
  const activity = mergeTaskActivity(current ?? { comments: [] }).filter((row) => {
    if (activityTab === "comment") return row.kind === "comment";
    if (activityTab === "history") return row.kind !== "comment";
    return true;
  });

  function personName(id: string) {
    if (!id) return t.task.activityEmptyValue;
    return staff.find((u) => u.id === id)?.name ?? id;
  }

  function namesFromIds(value: string) {
    const ids = value.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return t.task.activityEmptyValue;
    return ids.map(personName).join(", ");
  }

  function fieldLabel(field: string) {
    if (field === "status") return t.task.status;
    if (field === "priority") return t.task.priority;
    if (field === "assignee_ids") return t.task.assignee;
    if (field === "verifier_id") return t.task.verifier;
    if (field === "due_day") return t.task.due;
    if (field === "title") return t.task.titleField;
    if (field === "parent_id") return t.task.parent;
    if (field === "branch_id") return t.common.branch;
    if (field === "note" || field === "note_image_urls") return t.task.note;
    return field;
  }

  function fieldValue(field: string, value: string) {
    if (!value) return t.task.activityEmptyValue;
    if (field === "status") return taskStatusLabel(value as TaskStatus, lang);
    if (field === "priority") return taskPriorityLabel(value as TaskPriority, lang);
    if (field === "assignee_ids" || field === "verifier_id") return namesFromIds(value);
    if (field === "parent_id") return parents.find((p) => p.id === value)?.name ?? value;
    if (field === "branch_id") return branches.find((b) => b.id === value)?.name ?? value;
    return value;
  }

  function formatAt(iso: string) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso.slice(0, 16).replace("T", " ");
    return date.toLocaleString(lang === "vi" ? "vi-VN" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const { leaving, requestClose } = useOverlayClose(onClose);

  function clearNotePending() {
    setNotePendingPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setNotePendingFiles([]);
  }

  function onPickNoteImages(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: File[] = [];
    for (const file of Array.from(list)) {
      if (file.type.startsWith("image/")) next.push(file);
    }
    if (next.length === 0) {
      setError(t.task.uploadFail);
      return;
    }
    setNotePendingFiles((prev) => {
      const room = Math.max(0, 10 - noteImageUrls.length - prev.length);
      const merged = [...prev, ...next].slice(0, prev.length + room);
      setNotePendingPreviews((old) => {
        old.forEach((url) => URL.revokeObjectURL(url));
        return merged.map((f) => URL.createObjectURL(f));
      });
      return merged;
    });
    setError("");
  }

  function removeNoteUrlAt(index: number) {
    setNoteImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNotePendingAt(index: number) {
    setNotePendingFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setNotePendingPreviews((old) => {
        old.forEach((url, i) => {
          if (i === index) URL.revokeObjectURL(url);
        });
        return old.filter((_, i) => i !== index);
      });
      return next;
    });
  }

  async function save() {
    if (!canSave || saving) return;
    const markDoneAllowed = canMarkTaskDone(me?.role, { verifierId }, me?.id);
    if (status === "done" && task?.status !== "done" && !markDoneAllowed) {
      setError(t.task.doneBlocked);
      return;
    }
    setSaving(true);
    setError("");
    try {
      let uploaded = [...noteImageUrls];
      if (maMode && notePendingFiles.length > 0) {
        setUploadingImages(true);
        try {
          const urls = await Promise.all(notePendingFiles.map((file) => apiUploadMedia(file)));
          uploaded = [...uploaded, ...urls].slice(0, 10);
        } catch (e) {
          setError(e instanceof Error && e.message !== "fail" ? e.message : t.task.uploadFail);
          return;
        } finally {
          setUploadingImages(false);
        }
      }
      if (task && !canEditFields && canChangeStatus) {
        if (status !== task.status) {
          await moveTaskStatus(task.id, status, me?.id);
        }
      } else {
        const code = task
          ? await updateTask({
              id: task.id,
              title,
              status,
              priority,
              assigneeId: assigneeIds[0] ?? "",
              assigneeIds,
              verifierId,
              branchId,
              parentId,
              dueDay,
              note,
              noteImageUrls: uploaded,
              actorId: me?.id,
            })
          : await createTask({
              title,
              status,
              priority,
              assigneeId: assigneeIds[0] ?? "",
              assigneeIds,
              verifierId,
              branchId,
              parentId,
              dueDay,
              note,
              noteImageUrls: uploaded,
              actorId: me?.id,
            });
        if (code) {
          setError(t.task.needTitle);
          return;
        }
      }
      clearNotePending();
      setNoteImageUrls(uploaded);
      onMutated?.();
      requestClose();
    } finally {
      setUploadingImages(false);
      setSaving(false);
    }
  }

  function clearCommentImages() {
    setCommentPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setCommentImages([]);
  }

  function onPickCommentImages(list: FileList | null) {
    if (!list || list.length === 0) return;
    const nextFiles: File[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) continue;
      nextFiles.push(file);
    }
    if (nextFiles.length === 0) {
      setCommentError(t.task.uploadFail);
      return;
    }
    setCommentImages((prev) => {
      const merged = [...prev, ...nextFiles].slice(0, 10);
      setCommentPreviews((old) => {
        old.forEach((url) => URL.revokeObjectURL(url));
        return merged.map((f) => URL.createObjectURL(f));
      });
      return merged;
    });
    setCommentError("");
  }

  function removeCommentImageAt(index: number) {
    setCommentImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setCommentPreviews((old) => {
        old.forEach((url, i) => {
          if (i === index) URL.revokeObjectURL(url);
        });
        return old.filter((_, i) => i !== index);
      });
      return next;
    });
  }

  async function sendComment() {
    if (!task || !me?.id || commentBusy) return;
    if (!comment.trim() && commentImages.length === 0) {
      setCommentError(t.task.needComment);
      return;
    }
    setCommentBusy(true);
    setCommentUploading(maMode && commentImages.length > 0);
    setCommentError("");
    try {
      const result = await addTaskComment({
        taskId: task.id,
        actorId: me.id,
        text: comment,
        imageFiles: maMode ? commentImages : [],
      });
      if (!result.ok) {
        if (result.code === "fields") setCommentError(t.task.needComment);
        else if (result.code === "upload") {
          setCommentError(
            result.message && result.message !== "fail" && result.message !== "network"
              ? result.message
              : t.task.uploadFail,
          );
        } else {
          setCommentError(
            result.message && result.message !== "fail" && result.message !== "network"
              ? result.message
              : t.common.fail,
          );
        }
        return;
      }
      setComment("");
      clearCommentImages();
      if (maMode) {
        try {
          setMaDetail(await fetchMaTask(task.id));
        } catch {
          /* ignore */
        }
        onMutated?.();
      }
    } finally {
      setCommentUploading(false);
      setCommentBusy(false);
    }
  }

  async function addParent() {
    if (!canEditParents || parentBusy) return;
    setParentBusy(true);
    setParentError("");
    try {
      const result = await createTaskParent(newParentName);
      if ("error" in result) {
        setParentError(t.task.needParentName);
        return;
      }
      setParentId(result.id);
      setNewParentName("");
      setAddingParent(false);
      onMutated?.();
    } finally {
      setParentBusy(false);
    }
  }

  function staffName(id: string) {
    if (!id) return t.task.unassigned;
    return staff.find((u) => u.id === id)?.name ?? id;
  }

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-w-md overflow-y-auto p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{task ? t.task.edit : t.task.create}</h2>
          <Button type="button" variant="ghost" onClick={requestClose}>{t.common.close}</Button>
        </div>

        {task && (callHref || zalo) ? (
          <div className="mt-3 flex gap-2">
            {callHref ? (
              <a href={callHref} className={cn("crm-outline inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--brand-500)] bg-white text-sm font-semibold text-[var(--brand-500)]")}>
                {t.task.call}
              </a>
            ) : null}
            {zalo ? (
              <a href={zalo} target="_blank" rel="noreferrer" className={cn("inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] text-sm font-semibold text-white")}>
                {t.task.zalo}
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <Field label={t.task.titleField}>
            <input className={inputClass} value={title} disabled={!canEditFields || saving} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t.task.parent}>
            <select className={cn(inputClass, "font-semibold")} value={parentId} disabled={!canEditFields || saving} onChange={(e) => setParentId(e.target.value)} style={parentId ? { borderColor: filterColorOf(parentId), color: filterColorOf(parentId) } : undefined}>
              <option value="">{t.task.noParent}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          {canEditParents ? (
            addingParent ? (
              <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
                <Field label={t.task.parentName}>
                  <input className={inputClass} value={newParentName} onChange={(e) => setNewParentName(e.target.value)} />
                </Field>
                {parentError ? <p className="text-sm text-rose-700">{parentError}</p> : null}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={parentBusy} onClick={() => { setAddingParent(false); setParentError(""); }}>{t.common.cancel}</Button>
                  <Button type="button" busy={parentBusy} onClick={() => void addParent()}>{parentBusy ? t.common.saving : t.task.createParent}</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setAddingParent(true)}>{t.task.createParent}</Button>
            )
          ) : canEditFields ? (
            <p className="text-xs text-slate-500">{t.task.parentOnlyBossManager}</p>
          ) : null}
          <Field label={t.task.status}>
            <select
              className={cn(inputClass, "font-semibold", taskStatusClass(status))}
              value={status}
              disabled={!canChangeStatus || saving}
              onChange={(e) => {
                const next = e.target.value as TaskStatus;
                if (
                  next === "done" &&
                  task?.status !== "done" &&
                  !canMarkTaskDone(me?.role, { verifierId }, me?.id)
                ) {
                  setError(t.task.doneBlocked);
                  return;
                }
                setError("");
                setStatus(next);
              }}
            >
              {taskStatuses(lang).map((s) => {
                const doneLocked =
                  s.id === "done" &&
                  task?.status !== "done" &&
                  !canMarkTaskDone(me?.role, { verifierId }, me?.id);
                return (
                  <option key={s.id} value={s.id} disabled={doneLocked}>
                    {doneLocked ? t.task.doneLockedOption : s.label}
                  </option>
                );
              })}
            </select>
            {!canMarkTaskDone(me?.role, { verifierId }, me?.id) ? (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <p>{t.task.doneOnlyBossVerifier}</p>
              </div>
            ) : null}
          </Field>
          <Field label={t.task.priority}>
            <select className={cn(inputClass, "font-semibold", taskPriorityClass(priority))} value={priority} disabled={!canEditFields || saving} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {taskPriorities(lang).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t.task.assignee}>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-white p-1.5">
              {staff.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-slate-400">{t.task.unassigned}</p>
              ) : (
                staff.map((u) => {
                  const on = assigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={!canEditFields || saving}
                      onClick={() =>
                        setAssigneeIds((cur) => (cur.includes(u.id) ? cur.filter((id) => id !== u.id) : [...cur, u.id]))
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-[var(--brand-50)] disabled:opacity-60"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2"
                        style={on ? { backgroundColor: "var(--brand-500)", borderColor: "var(--brand-500)" } : { borderColor: "var(--border)" }}
                      >
                        {on ? <Check size={13} strokeWidth={3.5} className="text-white" /> : null}
                      </span>
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: u.avatarColor }}
                      >
                        {initials(u.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </Field>
          <Field label={t.task.verifier}>
            <select className={inputClass} value={verifierId} disabled={!canEditFields || saving} onChange={(e) => setVerifierId(e.target.value)}>
              <option value="">{t.task.unassignedVerifier}</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t.common.branch}>
            <select className={inputClass} value={branchId} disabled={!canEditFields || saving} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t.task.due}>
            <input className={cn(inputClass, "font-semibold", taskDueClass(status, dueDay, localDayKey(), addDays(localDayKey(), 2)))} type="date" value={dueDay} disabled={!canEditFields || saving} onChange={(e) => setDueDay(e.target.value)} />
          </Field>
          <Field label={t.task.note}>
            <textarea
              className={cn(inputClass, "h-auto min-h-36 py-2")}
              value={note}
              disabled={!canEditFields || saving}
              rows={8}
              placeholder={t.task.notePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {noteImageUrls.length > 0 ? (
            <TaskImageGallery
              urls={noteImageUrls}
              viewLabel={t.task.viewImage}
              closeLabel={t.task.closeImage}
              prevLabel={t.task.prevImage}
              nextLabel={t.task.nextImage}
              counterLabel={(current, total) => fill(t.task.imageCount, { current, total })}
              removeLabel={t.task.removeImage}
              onRemove={canEditFields && !saving ? removeNoteUrlAt : undefined}
            />
          ) : null}
          {notePendingPreviews.length > 0 ? (
            <TaskImageGallery
              urls={notePendingPreviews}
              pending
              busy={uploadingImages}
              viewLabel={t.task.viewImage}
              closeLabel={t.task.closeImage}
              prevLabel={t.task.prevImage}
              nextLabel={t.task.nextImage}
              counterLabel={(current, total) => fill(t.task.imageCount, { current, total })}
              removeLabel={t.task.removeImage}
              onRemove={!saving && !uploadingImages ? removeNotePendingAt : undefined}
            />
          ) : null}
          {maMode && canEditFields ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-slate-700">
                <ImagePlus size={16} />
                {t.task.noteAttach}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  disabled={saving || noteImageUrls.length + notePendingFiles.length >= 10}
                  onChange={(e) => {
                    onPickNoteImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-slate-400">{t.task.noteHint}</p>
            </div>
          ) : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {canSave ? (
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" disabled={saving} onClick={requestClose}>{t.common.cancel}</Button>
              <Button type="button" busy={saving} onClick={() => void save()}>
                {saving ? (uploadingImages ? t.common.uploading : t.common.saving) : t.common.save}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{taskStatusLabel(status, lang)}</p>
          )}
        </div>

        {task ? (
          <section className="mt-8 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold text-slate-800">{t.task.activity}</h3>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ["all", t.task.activityAll],
                ["comment", t.task.activityComments],
                ["history", t.task.activityHistory],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-xs font-semibold",
                    activityTab === id ? "bg-white text-[var(--brand-600)] shadow-sm" : "text-slate-500",
                  )}
                  onClick={() => setActivityTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-3" aria-busy={commentsLoading || undefined} aria-label={commentsLoading ? t.common.loading : undefined}>
              {commentsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-1.5 h-4 w-3/4" />
                  </li>
                ))
              ) : activity.length === 0 ? (
                <li className="text-sm text-slate-400">{activityTab === "comment" ? t.task.noComments : t.task.noActivity}</li>
              ) : (
                activity.map((row) => (
                  <li key={row.id} className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-400">{formatAt(row.at)} · {staffName(row.actorId)}</p>
                    {row.kind === "comment" ? (
                      <div className="mt-1 space-y-2">
                        {row.text ? (
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{row.text}</p>
                        ) : null}
                        {(row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []).length > 0 ? (
                          <TaskImageGallery
                            urls={row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []}
                            viewLabel={t.task.viewImage}
                            closeLabel={t.task.closeImage}
                            prevLabel={t.task.prevImage}
                            nextLabel={t.task.nextImage}
                            counterLabel={(current, total) => fill(t.task.imageCount, { current, total })}
                          />
                        ) : null}
                      </div>
                    ) : row.kind === "created" ? (
                      <p className="mt-1 text-sm text-slate-700">{fill(t.task.activityCreated, { name: staffName(row.actorId) })}</p>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-slate-700">{fill(t.task.activityChanged, { name: staffName(row.actorId), field: fieldLabel(row.field) })}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{fill(t.task.activityFromTo, { from: fieldValue(row.field, row.fromValue), to: fieldValue(row.field, row.toValue) })}</p>
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
            {me?.id && canComment ? (
              <div className="mt-3 grid gap-2">
                <textarea
                  className={cn(inputClass, "h-auto min-h-24 py-2")}
                  placeholder={t.task.commentPlaceholder}
                  value={comment}
                  disabled={commentBusy}
                  rows={4}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void sendComment();
                    }
                  }}
                />
                {commentPreviews.length > 0 ? (
                  <TaskImageGallery
                    urls={commentPreviews}
                    pending
                    busy={commentUploading}
                    viewLabel={t.task.viewImage}
                    closeLabel={t.task.closeImage}
                    prevLabel={t.task.prevImage}
                    nextLabel={t.task.nextImage}
                    counterLabel={(current, total) => fill(t.task.imageCount, { current, total })}
                    removeLabel={t.task.removeImage}
                    onRemove={!commentBusy ? removeCommentImageAt : undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {maMode ? (
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-slate-700">
                      <ImagePlus size={16} />
                      {t.task.attachImage}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="sr-only"
                        disabled={commentBusy || commentImages.length >= 10}
                        onChange={(e) => {
                          onPickCommentImages(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                  <Button type="button" busy={commentBusy} onClick={() => void sendComment()}>
                    {commentBusy ? (commentUploading ? t.common.uploading : t.common.saving) : t.task.sendComment}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">{t.task.commentHint}</p>
                {commentError ? <p className="text-sm text-rose-700">{commentError}</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}
    </CrmDrawerShell>
  );
}
