"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Lock, Search } from "lucide-react";
import { Button, inputClass } from "@/components/ui";
import { canEditAccessMatrix, homePathForRole } from "@/lib/access";
import {
  ALL_ROLES,
  MATRIX_ROLES,
  TASK_CTA_KEYS,
  TASK_RECORD_KEYS,
  type AccessNavKey,
  type MatrixRole,
} from "@/lib/access-defaults";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { ALL_NAV_ITEMS, NAV_AI, NAV_GROUPS, NAV_SYSTEM } from "@/lib/nav";
import { TAB_GROUPS, type TabKey } from "@/lib/tabs";
import { cn } from "@/lib/utils";
import { useAccessStore } from "@/stores/access-store";
import { useAuthStore } from "@/stores/auth-store";
import type { Role, TaskAccessKey, TaskVisibility } from "@/types";

type Row =
  | { kind: "group"; id: string; label: string }
  | { kind: "nav"; key: AccessNavKey; label: string }
  | { kind: "tab"; key: TabKey; label: string }
  | { kind: "taskVisibility"; label: string }
  | { kind: "taskAction"; key: TaskAccessKey; label: string };

export default function AccessSettingsPage() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const byRole = useAccessStore((s) => s.byRole);
  const revision = useAccessStore((s) => s.revision);
  const setNav = useAccessStore((s) => s.setNav);
  const setTab = useAccessStore((s) => s.setTab);
  const setTaskVisibility = useAccessStore((s) => s.setTaskVisibility);
  const setTaskAction = useAccessStore((s) => s.setTaskAction);
  const resetDefaults = useAccessStore((s) => s.resetDefaults);
  const canEdit = canEditAccessMatrix(user?.role);
  const [q, setQ] = useState("");
  const [mobileRole, setMobileRole] = useState<MatrixRole>("owner");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!canEditAccessMatrix(user.role) && !useAccessStore.getState().hasNav(user.role, "access")) {
      router.replace(homePathForRole(user.role));
    }
  }, [user?.id, user?.role, router, revision]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const navLabel = (key: AccessNavKey) => {
    if (key === "access") return t.nav.access;
    const item = ALL_NAV_ITEMS.find((i) => i.key === key);
    return item ? t.nav[item.key] : key;
  };

  const tabLabel = (key: TabKey) => {
    const map: Record<TabKey, string> = {
      "student.overview": `${t.access.tabStudent} · ${t.drawer.tabOverview}`,
      "student.courses": `${t.access.tabStudent} · ${t.drawer.tabCourses}`,
      "student.attendance": `${t.access.tabStudent} · ${t.drawer.tabAttendance}`,
      "student.money": `${t.access.tabStudent} · ${t.drawer.tabPayments}`,
      "student.hold": `${t.access.tabStudent} · ${t.drawer.tabHolds}`,
      "student.notes": `${t.access.tabStudent} · ${t.drawer.tabNotes}`,
      "room.calendar": `${t.access.tabRoom} · ${t.roomsCal.calendar}`,
      "room.list": `${t.access.tabRoom} · ${t.roomsCal.list}`,
      "course.overview": `${t.access.tabCourse} · ${t.nav.overview}`,
      "course.classes": `${t.access.tabCourse} · ${t.nav.classes}`,
      "course.students": `${t.access.tabCourse} · ${t.nav.students}`,
      "course.teachers": `${t.access.tabCourse} · ${t.nav.teachers}`,
      "course.subscriptions": `${t.access.tabCourse} · ${t.nav.packages}`,
    };
    return map[key];
  };

  const taskActionLabel = (key: TaskAccessKey) => {
    const map: Record<TaskAccessKey, string> = {
      create: t.access.taskCreate,
      delete: t.access.taskDelete,
      changeStatus: t.access.taskChangeStatus,
      comment: t.access.taskComment,
      markDone: t.access.taskMarkDone,
      manageParents: t.access.taskManageParents,
      editFields: t.access.taskEditFields,
    };
    return map[key];
  };

  const rows = useMemo(() => {
    const out: Row[] = [];
    out.push({ kind: "group", id: "tasks", label: t.access.sectionTasks });
    out.push({ kind: "group", id: "tasks-vis", label: t.access.sectionTaskVisibility });
    out.push({ kind: "taskVisibility", label: t.access.taskVisibility });
    out.push({ kind: "group", id: "tasks-cta", label: t.access.sectionTaskCta });
    for (const key of TASK_CTA_KEYS) {
      out.push({ kind: "taskAction", key, label: taskActionLabel(key) });
    }
    out.push({ kind: "group", id: "tasks-record", label: t.access.sectionTaskRecord });
    for (const key of TASK_RECORD_KEYS) {
      out.push({ kind: "taskAction", key, label: taskActionLabel(key) });
    }

    out.push({ kind: "group", id: "menu", label: t.access.sectionMenu });
    const pushNavGroup = (title: string, keys: AccessNavKey[]) => {
      out.push({ kind: "group", id: `g-${title}`, label: title });
      for (const key of keys) out.push({ kind: "nav", key, label: navLabel(key) });
    };
    pushNavGroup(t.nav.overview, ["overview", "schedule"]);
    for (const group of NAV_GROUPS) {
      pushNavGroup(t.nav[group.title], group.items.map((i) => i.key));
    }
    pushNavGroup(t.nav.ai, [NAV_AI.key]);
    pushNavGroup(t.nav.system, NAV_SYSTEM.items.map((i) => i.key));

    out.push({ kind: "group", id: "tabs", label: t.access.sectionTabs });
    for (const group of TAB_GROUPS) {
      const title =
        group.key === "student" ? t.access.tabStudent : group.key === "room" ? t.access.tabRoom : t.access.tabCourse;
      out.push({ kind: "group", id: `tg-${group.key}`, label: title });
      for (const tab of group.tabs) out.push({ kind: "tab", key: tab.key, label: tabLabel(tab.key) });
    }
    void revision;
    return out;
  }, [t, lang, revision]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      if (row.kind === "group") return true;
      return row.label.toLowerCase().includes(needle);
    });
  }, [rows, q]);

  function isOn(role: Role, row: Extract<Row, { kind: "nav" | "tab" | "taskAction" }>) {
    if (role === "boss") return true;
    const pack = byRole[role as MatrixRole];
    if (!pack) return true;
    if (row.kind === "nav") return pack.items[row.key] !== false;
    if (row.kind === "tab") return pack.tabs[row.key] !== false;
    return pack.tasks?.actions[row.key] !== false;
  }

  function visibilityOf(role: Role): TaskVisibility {
    if (role === "boss") return "all";
    return byRole[role as MatrixRole]?.tasks?.visibility === "all" ? "all" : "mine";
  }

  async function toggle(role: MatrixRole, row: Extract<Row, { kind: "nav" | "tab" | "taskAction" }>) {
    if (!canEdit) return;
    const next = !isOn(role, row);
    if (row.kind === "nav") await setNav(role, row.key, next);
    else if (row.kind === "tab") await setTab(role, row.key, next);
    else await setTaskAction(role, row.key, next);
    setToast(t.access.saved);
  }

  async function setVis(role: MatrixRole, visibility: TaskVisibility) {
    if (!canEdit) return;
    await setTaskVisibility(role, visibility);
    setToast(t.access.saved);
  }

  function rowHiddenEverywhere(row: Extract<Row, { kind: "nav" | "tab" | "taskAction" }>) {
    return MATRIX_ROLES.every((role) => !isOn(role, row));
  }

  const Toggle = ({
    role,
    row,
    locked,
  }: {
    role: Role;
    row: Extract<Row, { kind: "nav" | "tab" | "taskAction" }>;
    locked?: boolean;
  }) => {
    const on = isOn(role, row);
    return (
      <button
        type="button"
        disabled={locked || !canEdit}
        aria-pressed={on}
        aria-label={`${roleLabel(role, lang)} · ${row.label}`}
        onClick={() => {
          if (locked || role === "boss") return;
          void toggle(role as MatrixRole, row);
        }}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-150",
          on
            ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-white"
            : "border-[var(--border)] bg-slate-100 text-slate-400",
          locked || !canEdit
            ? "cursor-default opacity-90"
            : on
              ? "hover:scale-105 hover:border-[var(--brand-600)] hover:bg-[var(--brand-600)]"
              : "hover:scale-105 hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]",
        )}
      >
        {locked ? <Lock size={14} /> : on ? <Check size={16} strokeWidth={2.5} /> : null}
      </button>
    );
  };

  const VisControl = ({ role, locked }: { role: Role; locked?: boolean }) => {
    const value = visibilityOf(role);
    const disabled = locked || !canEdit || role === "boss";
    return (
      <div
        role="group"
        aria-label={`${roleLabel(role, lang)} · ${t.access.taskVisibility}`}
        className="inline-flex max-w-full flex-col gap-1 sm:inline-flex sm:flex-row sm:rounded-xl sm:border sm:border-[var(--border)] sm:bg-white sm:p-0.5"
      >
        {([
          { id: "all" as const, short: t.access.taskVisAllShort, full: t.access.taskVisAll },
          { id: "mine" as const, short: t.access.taskVisMineShort, full: t.access.taskVisMine },
        ]).map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              title={opt.full}
              onClick={() => {
                if (disabled) return;
                void setVis(role as MatrixRole, opt.id);
              }}
              className={cn(
                "whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition sm:min-w-[6.5rem]",
                on
                  ? "bg-[var(--brand-500)] text-white"
                  : "bg-[var(--brand-50)] text-[var(--brand-600)] sm:bg-transparent sm:text-slate-500",
                disabled ? "cursor-default opacity-90" : "hover:opacity-90",
              )}
            >
              {locked && opt.id === "all" ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <Lock size={11} />
                  {opt.short}
                </span>
              ) : (
                opt.short
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.access.title}</h1>
          <p className="crm-lead mt-1">{t.access.lead}</p>
          {!canEdit ? <p className="mt-1 text-xs font-medium text-amber-700">{t.access.viewOnly}</p> : null}
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void resetDefaults().then(() => setToast(t.access.resetDone));
            }}
          >
            {t.access.reset}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className={cn(inputClass, "pl-9")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.access.search}
            aria-label={t.access.search}
          />
        </label>
      </div>

      {/* Mobile: chọn role */}
      <div className="mt-4 flex gap-1 overflow-x-auto lg:hidden" role="tablist" aria-label={t.access.roles}>
        {MATRIX_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            role="tab"
            aria-selected={mobileRole === role}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold",
              mobileRole === role ? "bg-[var(--brand-500)] text-white" : "bg-slate-100 text-slate-600",
            )}
            onClick={() => setMobileRole(role)}
          >
            {roleLabel(role, lang)}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 lg:hidden">
        {filtered.map((row) => {
          if (row.kind === "group") {
            return (
              <h2 key={row.id} className="crm-section-title pt-3 first:pt-0">
                {row.label}
              </h2>
            );
          }
          if (row.kind === "taskVisibility") {
            return (
              <div
                key="task-visibility"
                className="rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-[var(--shadow-card)]"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                <div className="mt-2">
                  <VisControl role={mobileRole} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={`${row.kind}-${row.key}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                {row.kind !== "taskVisibility" && rowHiddenEverywhere(row) ? (
                  <p className="text-xs text-amber-600">{t.access.hiddenAll}</p>
                ) : null}
              </div>
              <Toggle role={mobileRole} row={row} />
            </div>
          );
        })}
        <div className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--brand-50)] px-3 py-3 text-xs leading-relaxed text-[var(--brand-700,#3c3b87)]">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>{t.access.taskRuleNote}</p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--background)]">
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-2 py-3 font-semibold text-[var(--muted)]">{t.access.colItem}</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-2 py-3 text-center font-semibold text-[var(--foreground)]">
                  {roleLabel(role, lang)}
                  {role === "boss" ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-[var(--muted)]">{t.access.locked}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              if (row.kind === "group") {
                return (
                  <tr key={row.id} className="bg-[var(--search)]">
                    <td colSpan={1 + ALL_ROLES.length} className="px-2 py-2 text-xs font-bold tracking-wide text-[var(--muted)] uppercase">
                      {row.label}
                    </td>
                  </tr>
                );
              }
              if (row.kind === "taskVisibility") {
                return (
                  <tr key="task-visibility" className="border-b border-slate-100">
                    <td className="px-2 py-2.5">
                      <span className="font-medium text-[var(--foreground)]">{row.label}</span>
                    </td>
                    {ALL_ROLES.map((role) => (
                      <td key={role} className="px-2 py-2.5 text-center">
                        <VisControl role={role} locked={role === "boss"} />
                      </td>
                    ))}
                  </tr>
                );
              }
              return (
                <tr key={`${row.kind}-${row.key}`} className="border-b border-slate-100">
                  <td className="px-2 py-2.5">
                    <span className="font-medium text-[var(--foreground)]">{row.label}</span>
                    {rowHiddenEverywhere(row) ? (
                      <span className="mt-0.5 block text-xs text-amber-600">{t.access.hiddenAll}</span>
                    ) : null}
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role} className="px-2 py-2.5 text-center">
                      <Toggle role={role} row={row} locked={role === "boss"} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--brand-50)] px-4 py-3 text-sm leading-relaxed text-[var(--brand-700,#3c3b87)]">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>{t.access.taskRuleNote}</p>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
