"use client";

import { X } from "lucide-react";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { FilterGroup, filterColorOf, type FilterRowDef } from "@/components/filter-checklist";
import { sessionStatusLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { roomWithBranch } from "@/lib/utils";
import type { Branch, ClassSession, Course, Room, SessionStatus, User } from "@/types";

const STATUS_COLORS: Record<SessionStatus, string> = {
  upcoming: "#0ea5e9",
  ongoing: "#5d5cc4",
  completed: "#94a3b8",
  cancelled: "#ef4444",
};

export type ScheduleFilterSelection = {
  teachers: string[];
  rooms: string[];
  courses: string[];
  statuses: SessionStatus[];
};

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

  const teacherRows: FilterRowDef[] = teachers.map((u) => ({
    key: u.id,
    label: u.name,
    count: teacherCounts.get(u.id) ?? 0,
    color: filterColorOf(u.id),
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
          color: filterColorOf(r.id),
          checked: selection.rooms.includes(r.id),
          onToggle: () => onToggle("rooms", r.id),
        })),
    }))
    .filter((s) => s.rows.length > 0);
  const courseRows: FilterRowDef[] = courses.map((c) => ({
    key: c.id,
    label: c.name,
    count: courseCounts.get(c.id) ?? 0,
    color: filterColorOf(c.id),
    checked: selection.courses.includes(c.id),
    onToggle: () => onToggle("courses", c.id),
  }));
  const statusRows: FilterRowDef[] = (["upcoming", "ongoing", "completed", "cancelled"] as const).map((status) => ({
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
