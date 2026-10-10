"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { canManageTasks } from "@/lib/access";
import { addTaskComment, createTask, createTaskParent, moveTaskStatus, updateTask } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { taskPriorities, taskPriorityLabel, taskStatusLabel, taskStatuses } from "@/lib/labels";
import { cn, initials, localDayKey, zaloHref } from "@/lib/utils";
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

function priorityTone(priority: TaskPriority): "danger" | "warn" | "neutral" {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warn";
  return "neutral";
}

export default function TasksPage() {
  const { lang, t } = useI18n();
  const me = useAuthStore((s) => s.user);
  const canEdit = canManageTasks(me?.role);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const parents = useLiveQuery(() => db.taskParents.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId: studioBranch } = useStudioBranch();
  const staff = users.filter((u) => u.role === "owner" || u.role === "reception" || u.role === "teacher");
  const today = localDayKey();
  const soonDay = addDays(today, 2);
  const statuses = taskStatuses(lang);
  const priorities = taskPriorities(lang);

  const [mode, setMode] = useState<Mode>("board");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [parentFilter, setParentFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parents) map.set(p.id, p.name);
    return map;
  }, [parents]);

  const visible = useMemo(() => {
    return tasks
      .filter((task) => {
        if (assigneeFilter === "mine" && me?.id && task.assigneeId !== me.id) return false;
        if (assigneeFilter !== "all" && assigneeFilter !== "mine" && task.assigneeId !== assigneeFilter) return false;
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (studioBranch !== "all" && task.branchId && task.branchId !== studioBranch) return false;
        if (parentFilter === "none" && task.parentId) return false;
        if (parentFilter !== "all" && parentFilter !== "none" && task.parentId !== parentFilter) return false;
        if (overdueOnly && !(task.status !== "done" && task.dueDay < today)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.dueDay !== b.dueDay) return a.dueDay.localeCompare(b.dueDay);
        return a.title.localeCompare(b.title);
      });
  }, [tasks, me?.id, assigneeFilter, statusFilter, priorityFilter, studioBranch, parentFilter, overdueOnly, today]);

  const parentProgress = useMemo(() => {
    const source = tasks.filter((task) => {
      if (studioBranch !== "all" && task.branchId && task.branchId !== studioBranch) return false;
      if (assigneeFilter === "mine" && me?.id && task.assigneeId !== me.id) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "mine" && task.assigneeId !== assigneeFilter) return false;
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
      })
      .filter((group) => (parentFilter === "all" ? group.total > 0 : group.id === parentFilter));
  }, [tasks, parents, studioBranch, assigneeFilter, me?.id, parentFilter]);

  const open = tasks.find((task) => task.id === openId) ?? null;

  function staffName(id: string) {
    if (!id) return t.task.unassigned;
    return users.find((u) => u.id === id)?.name ?? id;
  }

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
    if (!task || task.status === status) return;
    if (!canEdit && task.assigneeId !== me?.id) return;
    await moveTaskStatus(taskId, status);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.task.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.task.subtitle}</p>
          {!canEdit ? <p className="mt-1 text-xs text-slate-400">{t.task.viewOnly}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "list" ? "primary" : "outline"} onClick={() => setMode("list")}>
            {t.task.list}
          </Button>
          <Button type="button" variant={mode === "board" ? "primary" : "outline"} onClick={() => setMode("board")}>
            {t.task.board}
          </Button>
          {canEdit ? (
            <Button type="button" onClick={() => { setCreating(true); setOpenId(null); }}>
              {t.task.create}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-1">
        <select className={`${inputClass} max-w-[11rem] shrink-0`} aria-label={t.task.parent} value={parentFilter} onChange={(e) => setParentFilter(e.target.value)}>
          <option value="all">{t.task.allParents}</option>
          <option value="none">{t.task.noParent}</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label className="block min-w-[14rem] max-w-[18rem] shrink-0">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t.task.assignee}</span>
          <select className={`${inputClass} w-full`} aria-label={t.task.assignee} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">{t.task.allStaff}</option>
            <option value="mine">{t.task.mine}</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>{u.name} · {t.role[u.role]}</option>
            ))}
          </select>
        </label>
        <select className={`${inputClass} max-w-[9rem] shrink-0`} aria-label={t.task.status} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "all")}>
          <option value="all">{t.task.status}</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select className={`${inputClass} max-w-[9rem] shrink-0`} aria-label={t.task.priority} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}>
          <option value="all">{t.task.priority}</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOverdueOnly((v) => !v)}
          className={cn(
            "h-10 shrink-0 rounded-[10px] border px-3 text-sm font-semibold",
            overdueOnly ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-600)]" : "border-[#E2E8F0] text-slate-600",
          )}
        >
          {t.task.overdueOnly}
        </button>
      </div>

      {parentFilter !== "none" && parentProgress.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {parentProgress.map((group) => {
            const pct = group.total === 0 ? 0 : Math.round((group.done / group.total) * 100);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setParentFilter(group.id)}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                  <p className="text-xs tabular-nums text-slate-500">{fill(t.task.progressCount, { done: group.done, total: group.total })}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t.task.progress} · {pct}%
                  {group.earliest ? ` · ${fill(t.task.earliestDue, { day: group.earliest })}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {visible.length === 0 ? (
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
              {visible.map((task) => {
                const overdue = task.status !== "done" && task.dueDay < today;
                const soon = !overdue && task.status !== "done" && task.dueDay <= soonDay;
                const group = parentName(task.parentId);
                return (
                  <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <select
                        className="h-9 rounded-[8px] border border-[#E2E8F0] bg-white px-2 text-sm"
                        value={task.status}
                        disabled={!canEdit && task.assigneeId !== me?.id}
                        onChange={(e) => void moveTaskStatus(task.id, e.target.value as TaskStatus)}
                      >
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="text-left font-medium text-slate-900" onClick={() => { setOpenId(task.id); setCreating(false); }}>
                        {task.title}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      {group ? <Badge tone="neutral">{group}</Badge> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        {(() => {
                          const person = users.find((u) => u.id === task.assigneeId);
                          return person ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: person.avatarColor }}>{initials(person.name)}</span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">—</span>
                          );
                        })()}
                        {staffName(task.assigneeId)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={priorityTone(task.priority)}>{taskPriorityLabel(task.priority, lang)}</Badge>
                    </td>
                    <td className={cn("px-3 py-3 tabular-nums", dueTone(task.status, task.dueDay, today, soonDay))}>
                      {t.task.due}: {task.dueDay}
                      {overdue ? ` · ${t.pages.overdue}` : soon ? ` · ${t.task.dueSoon}` : ""}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{branchName(task.branchId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {statuses.map((col) => {
            const rows = visible.filter((task) => task.status === col.id);
            return (
              <section
                key={col.id}
                className="w-[272px] shrink-0 rounded-[12px] border border-[#E2E8F0] bg-slate-50 p-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task");
                  if (id) void onDrop(col.id, id);
                }}
              >
                <div className="flex items-center justify-between px-2 py-2">
                  <h2 className="text-sm font-bold text-slate-700">{col.label}</h2>
                  <span className="rounded-[6px] bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{rows.length}</span>
                </div>
                <ul className="space-y-2">
                  {rows.map((task) => {
                    const overdue = task.status !== "done" && task.dueDay < today;
                    const soon = !overdue && task.status !== "done" && task.dueDay <= soonDay;
                    const assignee = users.find((u) => u.id === task.assigneeId);
                    const movable = canEdit || task.assigneeId === me?.id;
                    const group = parentName(task.parentId);
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          draggable={movable}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/task", task.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => { setOpenId(task.id); setCreating(false); }}
                          className="w-full rounded-[12px] border border-[#E2E8F0] bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                        >
                          {group ? (
                            <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-600)]">{group}</p>
                          ) : null}
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge tone={priorityTone(task.priority)}>{taskPriorityLabel(task.priority, lang)}</Badge>
                            <span className={cn("text-xs tabular-nums", dueTone(task.status, task.dueDay, today, soonDay))}>
                              {t.task.due}: {task.dueDay}{overdue ? ` · ${t.pages.overdue}` : soon ? ` · ${t.task.dueSoon}` : ""}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {assignee ? (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ background: assignee.avatarColor }}
                              >
                                {initials(assignee.name)}
                              </span>
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">—</span>
                            )}
                            <span className="truncate text-xs text-slate-500">{staffName(task.assigneeId)}</span>
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

      {creating || open ? (
        <TaskDrawer
          task={creating ? undefined : open ?? undefined}
          staff={staff}
          branches={branches}
          parents={parents}
          me={me}
          canEdit={canEdit || (!!open && open.assigneeId === me?.id)}
          onClose={() => { setCreating(false); setOpenId(null); }}
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
  canEdit,
  onClose,
}: {
  task?: StudioTask;
  staff: User[];
  branches: { id: string; name: string }[];
  parents: TaskParent[];
  me: User | null | undefined;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const liveTask = useLiveQuery(() => (task ? db.tasks.get(task.id) : undefined), [task?.id]);
  const current = liveTask ?? task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const { branchId: studioBranch } = useStudioBranch();
  const [branchId, setBranchId] = useState(task?.branchId ?? (studioBranch !== "all" ? studioBranch : ""));
  const [parentId, setParentId] = useState(task?.parentId ?? "");
  const [dueDay, setDueDay] = useState(task?.dueDay ?? localDayKey());
  const [note, setNote] = useState(task?.note ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [parentError, setParentError] = useState("");
  const [addingParent, setAddingParent] = useState(false);

  const assignee = staff.find((u) => u.id === (assigneeId || current?.assigneeId));
  const phone = assignee?.phone?.trim() ?? "";
  const callHref = phone ? `tel:${phone.replace(/\s/g, "")}` : "";
  const zalo = phone ? zaloHref(phone) : "";
  const comments = [...(current?.comments ?? [])].sort((a, b) => b.day.localeCompare(a.day));

  async function save() {
    if (!canEdit) return;
    const code = task
      ? await updateTask({ id: task.id, title, status, priority, assigneeId, branchId, parentId, dueDay, note })
      : await createTask({ title, status, priority, assigneeId, branchId, parentId, dueDay, note });
    if (code) {
      setError(t.task.needTitle);
      return;
    }
    onClose();
  }

  async function sendComment() {
    if (!task || !me?.id) return;
    const code = await addTaskComment({ taskId: task.id, actorId: me.id, text: comment });
    if (code) {
      setCommentError(t.task.needComment);
      return;
    }
    setComment("");
    setCommentError("");
  }

  async function addParent() {
    if (!canEdit) return;
    const result = await createTaskParent(newParentName);
    if ("error" in result) {
      setParentError(t.task.needParentName);
      return;
    }
    setParentId(result.id);
    setNewParentName("");
    setParentError("");
    setAddingParent(false);
  }

  function staffName(id: string) {
    if (!id) return t.task.unassigned;
    return staff.find((u) => u.id === id)?.name ?? id;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.common.close} onClick={onClose} />
      <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{task ? t.task.edit : t.task.create}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>{t.common.close}</Button>
        </div>

        {task && (callHref || zalo) ? (
          <div className="mt-3 flex gap-2">
            {callHref ? (
              <a href={callHref} className={cn("crm-outline inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--brand-500)] bg-white text-sm font-semibold text-[var(--brand-500)]")}>
                {t.task.call}
              </a>
            ) : null}
            {zalo ? (
              <a href={zalo} target="_blank" rel="noreferrer" className={cn("inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[var(--brand-500)] text-sm font-semibold text-white")}>
                {t.task.zalo}
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <Field label={t.task.titleField}>
            <input className={inputClass} value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t.task.parent}>
            <select className={inputClass} value={parentId} disabled={!canEdit} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{t.task.noParent}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          {canEdit ? (
            addingParent ? (
              <div className="grid gap-2 rounded-[12px] border border-[#E2E8F0] bg-slate-50 p-3">
                <Field label={t.task.parentName}>
                  <input className={inputClass} value={newParentName} onChange={(e) => setNewParentName(e.target.value)} />
                </Field>
                {parentError ? <p className="text-sm text-rose-700">{parentError}</p> : null}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setAddingParent(false); setParentError(""); }}>{t.common.cancel}</Button>
                  <Button type="button" onClick={() => void addParent()}>{t.task.createParent}</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setAddingParent(true)}>{t.task.createParent}</Button>
            )
          ) : null}
          <Field label={t.task.status}>
            <select className={inputClass} value={status} disabled={!canEdit} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {taskStatuses(lang).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t.task.priority}>
            <select className={inputClass} value={priority} disabled={!canEdit} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {taskPriorities(lang).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t.task.assignee}>
            <select className={inputClass} value={assigneeId} disabled={!canEdit} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{t.task.unassigned}</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t.common.branch}>
            <select className={inputClass} value={branchId} disabled={!canEdit} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t.task.due}>
            <input className={inputClass} type="date" value={dueDay} disabled={!canEdit} onChange={(e) => setDueDay(e.target.value)} />
          </Field>
          <Field label={t.task.note}>
            <input className={inputClass} value={note} disabled={!canEdit} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {canEdit ? (
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
              <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{taskStatusLabel(status, lang)}</p>
          )}
        </div>

        {task ? (
          <section className="mt-8 border-t border-[#E2E8F0] pt-4">
            <h3 className="text-sm font-bold text-slate-800">{t.task.comments}</h3>
            <ul className="mt-3 space-y-3">
              {comments.length === 0 ? (
                <li className="text-sm text-slate-400">{t.task.noComments}</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="rounded-[12px] border border-[#E2E8F0] bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-400">{c.day} · {staffName(c.actorId)}</p>
                    <p className="mt-1 text-sm text-slate-700">{c.text}</p>
                  </li>
                ))
              )}
            </ul>
            {me?.id ? (
              <div className="mt-3 grid gap-2">
                <input
                  className={inputClass}
                  placeholder={t.task.commentPlaceholder}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendComment();
                  }}
                />
                {commentError ? <p className="text-sm text-rose-700">{commentError}</p> : null}
                <Button type="button" onClick={() => void sendComment()}>{t.task.sendComment}</Button>
              </div>
            ) : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
