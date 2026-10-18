"use client";

import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { sessionStatusLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { roomWithBranch } from "@/lib/utils";
import type { Branch, ClassSession, Course, Room, SessionStatus, User } from "@/types";

const PALETTE = ["#5d5cc4", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];

const STATUS_COLORS: Record<SessionStatus, string> = {
  upcoming: "#0ea5e9",
  ongoing: "#5d5cc4",
  completed: "#94a3b8",
  cancelled: "#ef4444",
};

function colorOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export type ScheduleFilterSelection = {
  teachers: string[];
  rooms: string[];
  courses: string[];
  statuses: SessionStatus[];
};

type RowDef = {
  key: string;
  label: string;
  count: number;
  color: string;
  checked: boolean;
  onToggle: () => void;
};

function FilterRow({ def }: { def: RowDef }) {
  return (
    <button type="button" onClick={def.onToggle} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--brand-50)]">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition"
        style={def.checked ? { backgroundColor: def.color, borderColor: def.color } : { borderColor: `${def.color}66` }}
      >
        {def.checked ? <Check size={13} strokeWidth={3.5} className="text-white" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{def.label}</span>
      <span className="text-xs tabular-nums text-[var(--muted)]">{def.count}</span>
    </button>
  );
}

function FilterGroup({ title, sections }: { title: string; sections: { subtitle?: string; rows: RowDef[] }[] }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  if (total === 0) return null;
  const visible: Array<{ kind: "sub"; label: string } | { kind: "row"; def: RowDef }> = [];
  let shown = 0;
  for (const section of sections) {
    const take = expanded ? section.rows.length : Math.min(section.rows.length, Math.max(0, 6 - shown));
    if (take === 0) continue;
    if (section.subtitle) visible.push({ kind: "sub", label: section.subtitle });
    for (const def of section.rows.slice(0, take)) visible.push({ kind: "row", def });
    shown += take;
  }
  return (
    <section className="crm-card-elev p-4">
      <h3 className="crm-section-title">{title}</h3>
      <div className="mt-1.5">
        {visible.map((item, i) =>
          item.kind === "sub" ? (
            <p key={`sub-${i}`} className="px-2 pt-1.5 text-xs font-semibold text-[var(--muted)]">{item.label}</p>
          ) : (
            <FilterRow key={item.def.key} def={item.def} />
          ),
        )}
      </div>
      {total > 6 ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)]">
          {expanded ? t.schedule.filterShowLess : t.schedule.filterShowMore.replace("{n}", String(total - 6))}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      ) : null}
    </section>
  );
}

export function ScheduleFilterDrawer({
  sessions,
  teachers,
  rooms,
  branches,
  courses,
  branchId,
  selection,
  onToggle,
  onClear,
  onClose,
  visibleCount,
}: {
  sessions: ClassSession[];
  teachers: User[];
  rooms: Room[];
  branches: Branch[];
  courses: Course[];
  branchId: string;
  selection: ScheduleFilterSelection;
  onToggle: (group: keyof ScheduleFilterSelection, id: string) => void;
  onClear: () => void;
  onClose: () => void;
  visibleCount: number;
}) {
  const { lang, t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  const scoped = sessions.filter((s) => branchId === "all" || s.branchId === branchId);
  const countBy = (fn: (s: ClassSession) => string) => {
    const map = new Map<string, number>();
    for (const s of scoped) {
      const key = fn(s);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const teacherCounts = countBy((s) => s.teacherId);
  const roomCounts = countBy((s) => s.roomId);
  const courseCounts = countBy((s) => s.courseId);
  const statusCounts = countBy((s) => s.status);
  const hasAny = selection.teachers.length > 0 || selection.rooms.length > 0 || selection.courses.length > 0 || selection.statuses.length > 0;

  const teacherRows: RowDef[] = teachers.map((u) => ({
    key: u.id,
    label: u.name,
    count: teacherCounts.get(u.id) ?? 0,
    color: colorOf(u.id),
    checked: selection.teachers.includes(u.id),
    onToggle: () => onToggle("teachers", u.id),
  }));
  const visibleBranches = branches.filter((b) => branchId === "all" || b.id === branchId);
  const roomSections = visibleBranches
    .map((b) => ({
      subtitle: b.name,
      rows: rooms
        .filter((r) => r.branchId === b.id)
        .map((r) => ({
          key: r.id,
          label: roomWithBranch(r.name, b.name),
          count: roomCounts.get(r.id) ?? 0,
          color: colorOf(r.id),
          checked: selection.rooms.includes(r.id),
          onToggle: () => onToggle("rooms", r.id),
        })),
    }))
    .filter((s) => s.rows.length > 0);
  const courseRows: RowDef[] = courses.map((c) => ({
    key: c.id,
    label: c.name,
    count: courseCounts.get(c.id) ?? 0,
    color: colorOf(c.id),
    checked: selection.courses.includes(c.id),
    onToggle: () => onToggle("courses", c.id),
  }));
  const statusRows: RowDef[] = (["upcoming", "ongoing", "completed", "cancelled"] as const).map((status) => ({
    key: status,
    label: sessionStatusLabel(status, lang),
    count: statusCounts.get(status) ?? 0,
    color: STATUS_COLORS[status],
    checked: selection.statuses.includes(status),
    onToggle: () => onToggle("statuses", status),
  }));

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-w-md overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <h2 className="crm-section-title text-lg">{t.schedule.filterTitle}</h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onClear} disabled={!hasAny} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)] disabled:opacity-40">
              {t.schedule.filterClear}
            </button>
            <button type="button" onClick={requestClose} aria-label={t.common.close} className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--brand-50)] hover:text-[var(--foreground)]">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <FilterGroup title={t.common.teacher} sections={[{ rows: teacherRows }]} />
          <FilterGroup title={t.common.room} sections={roomSections} />
          <FilterGroup title={t.common.course} sections={[{ rows: courseRows }]} />
          <FilterGroup title={t.common.status} sections={[{ rows: statusRows }]} />
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <p className="text-center text-xs text-[var(--muted)]">{t.schedule.filterShowing.replace("{v}", String(visibleCount)).replace("{t}", String(scoped.length))}</p>
        </div>
    </CrmDrawerShell>
  );
}
