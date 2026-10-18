"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Search } from "lucide-react";
import { Button, inputClass } from "@/components/ui";
import { canEditAccessMatrix, homePathForRole } from "@/lib/access";
import {
  ALL_ROLES,
  MATRIX_ROLES,
  type AccessNavKey,
  type MatrixRole,
} from "@/lib/access-defaults";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { ALL_NAV_ITEMS, NAV_AI, NAV_GROUPS, NAV_SYSTEM, NAV_TOP } from "@/lib/nav";
import { TAB_GROUPS, type TabKey } from "@/lib/tabs";
import { cn } from "@/lib/utils";
import { useAccessStore } from "@/stores/access-store";
import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types";

type Row =
  | { kind: "group"; id: string; label: string }
  | { kind: "nav"; key: AccessNavKey; label: string }
  | { kind: "tab"; key: TabKey; label: string };

export default function AccessSettingsPage() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const byRole = useAccessStore((s) => s.byRole);
  const revision = useAccessStore((s) => s.revision);
  const setNav = useAccessStore((s) => s.setNav);
  const setTab = useAccessStore((s) => s.setTab);
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
  }, [user, router]);

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

  const rows = useMemo(() => {
    const out: Row[] = [];
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

  function isOn(role: Role, row: Extract<Row, { kind: "nav" | "tab" }>) {
    if (role === "boss") return true;
    const pack = byRole[role as MatrixRole];
    if (!pack) return true;
    if (row.kind === "nav") return pack.items[row.key] !== false;
    return pack.tabs[row.key] !== false;
  }

  async function toggle(role: MatrixRole, row: Extract<Row, { kind: "nav" | "tab" }>) {
    if (!canEdit) return;
    const next = !isOn(role, row);
    if (row.kind === "nav") await setNav(role, row.key, next);
    else await setTab(role, row.key, next);
    setToast(t.access.saved);
  }

  function rowHiddenEverywhere(row: Extract<Row, { kind: "nav" | "tab" }>) {
    return MATRIX_ROLES.every((role) => !isOn(role, row));
  }

  const Toggle = ({
    role,
    row,
    locked,
  }: {
    role: Role;
    row: Extract<Row, { kind: "nav" | "tab" }>;
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.access.title}</h1>
          <p className="crm-lead mt-1">{t.access.lead}</p>
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
              "shrink-0 rounded-[5px] px-3 py-2 text-sm font-semibold",
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
          return (
            <div key={`${row.kind}-${row.key}`} className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border)] bg-white px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                {rowHiddenEverywhere(row) ? <p className="text-xs text-amber-600">{t.access.hiddenAll}</p> : null}
              </div>
              <Toggle role={mobileRole} row={row} />
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--background)]">
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-2 py-3 font-semibold text-[var(--muted)]">{t.access.colItem}</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-2 py-3 text-center font-semibold text-[var(--foreground)]">
                  {roleLabel(role, lang)}
                  {role === "boss" ? <span className="mt-0.5 block text-[10px] font-medium text-[var(--muted)]">{t.access.locked}</span> : null}
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
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[5px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
