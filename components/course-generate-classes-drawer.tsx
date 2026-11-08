"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button, inputClassInline } from "@/components/ui";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { apiGenerateCourseClasses } from "@/lib/api/crm-courses";
import {
  buildGenerateSessions,
  dowOf,
  groupSessionsByWeek,
  monthCells,
  monthKeyOf,
  selectedGenerateDays,
  selectedGenerateSessions,
  sessionTimeCustom,
  shiftMonth,
  weekEnabledState,
  type GenerateSession,
} from "@/lib/course-generate-preview";
import { useI18n } from "@/lib/i18n";
import { cn, weekdayShort } from "@/lib/utils";
import type { Course } from "@/types";

export function CourseGenerateClassesDrawer({
  course,
  onClose,
  onDone,
}: {
  course: Course;
  onClose: () => void;
  onDone: () => void;
}) {
  const { leaving, requestClose } = useOverlayClose(onClose);
  const { lang, t } = useI18n();
  const templateStart = course.start || "18:00";
  const templateEnd = course.end || "19:00";
  const [sessions, setSessions] = useState<GenerateSession[]>(() =>
    buildGenerateSessions({
      startDay: course.startDay,
      weekdays: course.weekdays,
      sessionCount: course.sessionCount || 8,
      start: templateStart,
      end: templateEnd,
    }),
  );
  const [monthKey, setMonthKey] = useState(() =>
    monthKeyOf(course.startDay || new Date().toISOString().slice(0, 10)),
  );
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const weeks = useMemo(() => groupSessionsByWeek(sessions), [sessions]);
  const selectedDays = useMemo(() => selectedGenerateDays(sessions), [sessions]);
  const customCount = useMemo(
    () =>
      sessions.filter((s) => s.enabled && sessionTimeCustom(s, templateStart, templateEnd)).length,
    [sessions, templateStart, templateEnd],
  );

  const dayMeta = useMemo(() => {
    const map = new Map<string, GenerateSession>();
    for (const s of sessions) map.set(s.day, s);
    return map;
  }, [sessions]);

  const cells = useMemo(() => monthCells(monthKey), [monthKey]);
  const weekHeader = [1, 2, 3, 4, 5, 6, 0].map((d) => weekdayShort(d, lang));

  function patchSession(day: string, patch: Partial<GenerateSession>) {
    setSessions((prev) => prev.map((s) => (s.day === day ? { ...s, ...patch } : s)));
  }

  function toggleDay(day: string) {
    setSessions((prev) =>
      prev.map((s) => (s.day === day ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function toggleWeek(weekDays: string[]) {
    const state = weekEnabledState(sessions, weekDays);
    const next = state !== "all";
    const set = new Set(weekDays);
    setSessions((prev) => prev.map((s) => (set.has(s.day) ? { ...s, enabled: next } : s)));
  }

  function focusSession(day: string) {
    setFocusDay(day);
    setMonthKey(monthKeyOf(day));
    requestAnimationFrame(() => {
      rowRefs.current.get(day)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function onCalendarDayClick(day: string) {
    if (!dayMeta.has(day)) return;
    focusSession(day);
  }

  async function confirm() {
    if (selectedDays.length === 0) {
      setError(t.catalog.genNeedDays);
      return;
    }
    for (const s of sessions) {
      if (!s.enabled) continue;
      if (!s.start || !s.end || s.end <= s.start) {
        setError(t.catalog.genBadTime);
        focusSession(s.day);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      await apiGenerateCourseClasses(course.id, selectedGenerateSessions(sessions));
      onDone();
      requestClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.fail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close}>
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{t.catalog.genTitle}</h2>
          <p className="truncate text-sm text-slate-500">
            {course.name} · {templateStart}–{templateEnd}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100"
          aria-label={t.common.close}
          onClick={requestClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <p className="text-sm text-slate-600">{t.catalog.genLead}</p>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">{t.catalog.genCalendar}</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]"
                aria-label={t.students.prev}
                onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[6.5rem] text-center text-sm font-semibold tabular-nums">{monthKey}</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]"
                aria-label={t.students.next}
                onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {weekHeader.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={t.catalog.genCalendar}>
            {cells.map((cell, i) => {
              if (!cell.day) return <span key={`e-${i}`} className="h-10" />;
              const meta = dayMeta.get(cell.day);
              const isClass = Boolean(meta);
              const on = meta?.enabled;
              const custom = meta
                ? sessionTimeCustom(meta, templateStart, templateEnd)
                : false;
              const focused = focusDay === cell.day;
              return (
                <button
                  key={cell.day}
                  type="button"
                  disabled={!isClass}
                  onClick={() => onCalendarDayClick(cell.day!)}
                  className={cn(
                    "relative flex h-10 items-center justify-center rounded-xl text-sm tabular-nums",
                    !cell.inMonth && "opacity-30",
                    !isClass && "cursor-default text-slate-600",
                    isClass && on && "bg-[var(--brand-500)] font-bold text-white",
                    isClass && !on && "bg-slate-200 font-semibold text-slate-400 line-through",
                    focused && "ring-2 ring-[var(--brand-600)] ring-offset-1",
                  )}
                >
                  {Number(cell.day.slice(8))}
                  {isClass && custom ? (
                    <span
                      className={cn(
                        "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
                        on ? "bg-amber-300" : "bg-amber-500",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.catalog.genCalHint}</p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-800">{t.catalog.genWeeks}</h3>
          <ul className="flex flex-wrap gap-2">
            {weeks.map((w) => {
              const state = weekEnabledState(sessions, w.days);
              return (
                <li key={w.weekStart}>
                  <label
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
                      state === "all"
                        ? "border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-700,#3c3b87)]"
                        : "border-[var(--border)] bg-white text-slate-600",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={state === "all"}
                      ref={(el) => {
                        if (el) el.indeterminate = state === "partial";
                      }}
                      onChange={() => toggleWeek(w.days)}
                    />
                    {w.weekStart.slice(5).replace("-", "/")}–{w.weekEnd.slice(5).replace("-", "/")}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-800">{t.catalog.genSessions}</h3>
          <ul className="space-y-2">
            {sessions.map((s) => {
              const custom = sessionTimeCustom(s, templateStart, templateEnd);
              const focused = focusDay === s.day;
              return (
                <li
                  key={s.day}
                  ref={(el) => {
                    if (el) rowRefs.current.set(s.day, el);
                    else rowRefs.current.delete(s.day);
                  }}
                  className={cn(
                    "rounded-2xl border bg-white px-3 py-3",
                    focused ? "border-[var(--brand-400)] shadow-sm" : "border-[var(--border)]",
                    !s.enabled && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={s.enabled}
                      onChange={() => toggleDay(s.day)}
                      aria-label={s.day}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center gap-2 text-left"
                        onClick={() => focusSession(s.day)}
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {s.day.slice(5).replace("-", "/")}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {weekdayShort(dowOf(s.day), lang)}
                        </span>
                        {custom ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {t.catalog.genCustomTime}
                          </span>
                        ) : null}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{t.schedule.start}</span>
                          <input
                            type="time"
                            className={cn(inputClassInline, "h-9 w-[7.5rem]")}
                            value={s.start}
                            disabled={!s.enabled}
                            onChange={(e) => patchSession(s.day, { start: e.target.value })}
                            onFocus={() => focusSession(s.day)}
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{t.schedule.end}</span>
                          <input
                            type="time"
                            className={cn(inputClassInline, "h-9 w-[7.5rem]")}
                            value={s.end}
                            disabled={!s.enabled}
                            onChange={(e) => patchSession(s.day, { end: e.target.value })}
                            onFocus={() => focusSession(s.day)}
                          />
                        </label>
                        {custom ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--brand-600)] hover:underline"
                            disabled={!s.enabled}
                            onClick={() =>
                              patchSession(s.day, { start: templateStart, end: templateEnd })
                            }
                          >
                            {t.catalog.genResetTime}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-sm font-semibold text-[var(--brand-700,#3c3b87)]">
          {t.catalog.genPreviewCount.replace("{n}", String(selectedDays.length))}
          {customCount > 0
            ? ` · ${t.catalog.genCustomCount.replace("{n}", String(customCount))}`
            : ""}
        </p>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      <footer className="flex shrink-0 gap-2 border-t border-[var(--border)] px-5 py-4">
        <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={requestClose}>
          {t.common.cancel}
        </Button>
        <Button type="button" className="flex-1" busy={saving} onClick={() => void confirm()}>
          {t.catalog.genConfirm}
        </Button>
      </footer>
    </CrmDrawerShell>
  );
}
