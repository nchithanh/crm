"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ListFilter } from "lucide-react";
import { ClassDrawer } from "@/components/class-drawer";
import { ScheduleFilterDrawer, type ScheduleFilterSelection } from "@/components/schedule-filter-drawer";
import { Button, inputClass } from "@/components/ui";
import { canEditSchedule } from "@/lib/access";
import { addOneOffSession, moveSession, syncSessionClock } from "@/lib/actions";
import { db } from "@/lib/db";
import { sessionStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import {
  conflictLabel,
  formatMinutes,
  GRID_END,
  GRID_START,
  minutesOf,
  nowLineInHour,
  nowMinutesOfDay,
  sessionTimePhase,
  type SessionTimePhase,
} from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";
import { cn, localDayKey, roomWithBranch, weekdayLabel, weekdayShort } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { ClassSession, SessionStatus } from "@/types";

const HOUR_ROWS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

type Group = "day" | "room" | "teacher" | "branch";

type Column = {
  id: string;
  day: string;
  title: string;
  sub: string;
  roomId?: string;
  teacherId?: string;
  branchId?: string;
};

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function eventTone(status: SessionStatus, phase: SessionTimePhase) {
  if (status === "cancelled") return "crm-cal-event crm-cal-event-cancelled";
  if (phase === "live") return "crm-cal-event crm-cal-event-live";
  if (phase === "past") return "crm-cal-event crm-cal-event-past";
  return "crm-cal-event crm-cal-event-upcoming";
}

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

function mondayOf(offsetWeeks: number) {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset + offsetWeeks * 7);
  return localDayKey(monday);
}

export default function SchedulePage() {
  const { lang, t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canEdit = canEditSchedule(user?.role);
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const [mode, setMode] = useState<"week" | "month">("week");
  const [group, setGroup] = useState<Group>("day");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { branchId } = useStudioBranch();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selection, setSelection] = useState<ScheduleFilterSelection>({ teachers: [], rooms: [], courses: [], statuses: [] });
  const [focusDay, setFocusDay] = useState(localDayKey());
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ courseId: "", day: localDayKey(), start: "18:00", end: "19:30", teacherId: "", roomId: "" });
  const dragged = useRef(false);
  const today = localDayKey();
  const [nowMin, setNowMin] = useState(() => nowMinutesOfDay());

  const teachers = users.filter((u) => u.role === "teacher");
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDay(mondayOf(weekOffset), i)), [weekOffset]);
  const monthCells = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 12);
    const startPad = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: Array<string | null> = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= days; d++) cells.push(localDayKey(new Date(first.getFullYear(), first.getMonth(), d, 12)));
    return cells;
  }, [monthOffset]);

  useEffect(() => {
    if (!weekDays.includes(focusDay)) setFocusDay(weekDays.includes(today) ? today : weekDays[0]);
  }, [weekDays, focusDay, today]);

  useEffect(() => {
    setNowMin(nowMinutesOfDay());
    const id = window.setInterval(() => setNowMin(nowMinutesOfDay()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function toggleFilter(group: keyof ScheduleFilterSelection, id: string) {
    setSelection((prev) => {
      const current = prev[group] as string[];
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      return { ...prev, [group]: next } as ScheduleFilterSelection;
    });
  }

  const filtered = sessions.filter((s) => {
    if (branchId !== "all" && s.branchId !== branchId) return false;
    if (selection.rooms.length && !selection.rooms.includes(s.roomId)) return false;
    if (selection.teachers.length && !selection.teachers.includes(s.teacherId)) return false;
    if (selection.courses.length && !selection.courses.includes(s.courseId)) return false;
    if (selection.statuses.length && !selection.statuses.includes(s.status)) return false;
    return true;
  });
  const columns: Column[] = useMemo(() => {
    if (group === "room") {
      return rooms
        .filter((r) => (branchId === "all" || r.branchId === branchId) && (selection.rooms.length === 0 || selection.rooms.includes(r.id)))
        .map((r) => ({ id: r.id, day: focusDay, title: r.name, sub: branches.find((b) => b.id === r.branchId)?.name ?? "", roomId: r.id }));
    }
    if (group === "teacher") {
      return teachers
        .filter((t) => selection.teachers.length === 0 || selection.teachers.includes(t.id))
        .map((t) => ({ id: t.id, day: focusDay, title: shortName(t.name), sub: t.name, teacherId: t.id }));
    }
    if (group === "branch") {
      return branches
        .filter((b) => branchId === "all" || b.id === branchId)
        .map((b) => ({ id: b.id, day: focusDay, title: b.name, sub: focusDay.slice(5), branchId: b.id }));
    }
    return weekDays.map((day) => ({
      id: day,
      day,
      title: weekdayLabel(new Date(`${day}T12:00:00`).getDay(), lang),
      sub: day === today ? t.schedule.today : day.slice(5),
    }));
  }, [group, rooms, teachers, branches, weekDays, focusDay, branchId, selection.rooms, selection.teachers, today, lang, t]);

  function sessionsIn(col: Column) {
    return filtered.filter((s) => {
      if (s.day !== col.day) return false;
      if (col.roomId && s.roomId !== col.roomId) return false;
      if (col.teacherId && s.teacherId !== col.teacherId) return false;
      if (col.branchId && s.branchId !== col.branchId) return false;
      return true;
    });
  }

  function seated(classId: string) {
    const klass = sessions.find((s) => s.id === classId);
    if (!klass) return 0;
    return students.filter((st) => st.courseId === klass.courseId && st.status !== "paused").length;
  }

  async function dropOn(event: React.DragEvent<HTMLElement>, col: Column) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/session");
    const session = sessions.find((s) => s.id === id);
    const cell = event.currentTarget as HTMLElement;
    if (!session || !user || !canEdit || !cell.dataset.hour) return;
    const hour = Number(cell.dataset.hour);
    const bounds = cell.getBoundingClientRect();
    const half = event.clientY > bounds.top + bounds.height / 2;
    let startMin = hour * 60 + (half ? 30 : 0);
    if (startMin < GRID_START * 60) startMin = GRID_START * 60;
    const duration = Math.max(30, minutesOf(session.end) - minutesOf(session.start));
    const endMin = startMin + duration;
    if (endMin > GRID_END * 60) {
      setNotice("Ngoài khung 07:00–22:00.");
      return;
    }
    let nextRoom = session.roomId;
    let nextTeacher = session.teacherId;
    let nextBranch = session.branchId;
    if (col.roomId) {
      nextRoom = col.roomId;
      nextBranch = rooms.find((r) => r.id === col.roomId)?.branchId ?? nextBranch;
    }
    if (col.teacherId) nextTeacher = col.teacherId;
    if (col.branchId) {
      const room = rooms.find((r) => r.id === nextRoom);
      if (room && room.branchId !== col.branchId) {
        setNotice("Phòng hiện tại không thuộc chi nhánh này.");
        return;
      }
      nextBranch = col.branchId;
    }
    const start = formatMinutes(startMin);
    const end = formatMinutes(endMin);
    const clash = conflictLabel(sessions, { id: session.id, day: col.day, start, end, teacherId: nextTeacher, roomId: nextRoom });
    if (clash) {
      setNotice(clash);
      return;
    }
    const error = await moveSession({
      sessionId: session.id,
      actorId: user.id,
      day: col.day,
      start,
      end,
      teacherId: nextTeacher,
      roomId: nextRoom,
      branchId: nextBranch,
    });
    setNotice(error);
  }

  function exportCsv() {
    const days = mode === "week" ? (group === "day" ? weekDays : [focusDay]) : monthCells.filter((d): d is string => Boolean(d));
    const rows = filtered.filter((s) => days.includes(s.day));
    const header = ["Ngày", "Bắt đầu", "Kết thúc", "Khóa", "Level", "Giáo viên", "Phòng", "Chi nhánh", "Sĩ số", "Trạng thái"];
    const lines = rows.map((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      const cap = classes.find((c) => c.id === s.classId)?.capacity ?? 0;
      return [
        s.day,
        s.start,
        s.end,
        course?.name ?? "",
        levelLabel(course?.level ?? ""),
        users.find((u) => u.id === s.teacherId)?.name ?? "",
        rooms.find((r) => r.id === s.roomId)?.name ?? "",
        branches.find((b) => b.id === s.branchId)?.name ?? "",
        `${seated(s.id ?? "")}/${cap}`,
        sessionStatusLabel(s.status, lang),
      ];
    });
    const csv = `\uFEFF${[header, ...lines].map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `lich-${today}.csv`;
    a.click();
  }

  async function syncView() {
    setWeekOffset(0);
    setMonthOffset(0);
    setFocusDay(today);
    await syncSessionClock();
    setNotice("Đã đồng bộ trạng thái theo hôm nay.");
  }

  async function createSession() {
    if (!user) return;
    const error = await addOneOffSession({ actorId: user.id, ...draft });
    setNotice(error);
    if (!error) setCreating(false);
  }

  const monthTitle = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const filterGroupCount = [selection.teachers, selection.rooms, selection.courses, selection.statuses].filter((list) => list.length > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.schedule.title}</h1>
          <p className="text-sm text-slate-500">{group === "day" ? `${weekDays[0].slice(8)}/${weekDays[0].slice(5, 7)} – ${weekDays[6].slice(8)}/${weekDays[6].slice(5, 7)}` : focusDay}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="relative">
            <Button variant="outline" onClick={() => setFilterOpen(true)}>
              <ListFilter size={16} />
              {t.schedule.filter}
            </Button>
            {filterGroupCount ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-500)] px-1 text-[11px] font-bold text-white">{filterGroupCount}</span> : null}
          </span>
          <Button variant={mode === "week" ? "primary" : "outline"} onClick={() => setMode("week")}>{t.schedule.week}</Button>
          <Button variant={mode === "month" ? "primary" : "outline"} onClick={() => setMode("month")}>{t.schedule.month}</Button>
          {canEdit ? <Button variant="outline" onClick={() => { setDraft((d) => ({ ...d, courseId: d.courseId || courses[0]?.id || "", teacherId: d.teacherId || teachers[0]?.id || "", roomId: d.roomId || rooms[0]?.id || "", day: focusDay })); setCreating(true); }}>{t.schedule.create}</Button> : null}
          <Button variant="ghost" onClick={exportCsv}>{t.schedule.export}</Button>
          <Button variant="ghost" onClick={() => void syncView()}>{t.schedule.sync}</Button>
        </div>
      </div>

      {mode === "week" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setWeekOffset((n) => n - 1)}>{t.schedule.prevWeek}</Button>
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setWeekOffset((n) => n + 1)}>{t.schedule.nextWeek}</Button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            {(["room", "teacher", "branch"] as const).map((key) => (
              <Button key={key} className="w-full whitespace-nowrap px-2 text-xs sm:w-auto sm:px-5 sm:text-sm" variant={group === key ? "primary" : "outline"} onClick={() => setGroup((g) => (g === key ? "day" : key))}>
                {key === "room" ? t.schedule.byRoom : key === "teacher" ? t.schedule.byTeacher : t.schedule.byBranch}
              </Button>
            ))}
          </div>
          {group !== "day" ? (
            <div className="crm-x-scroll flex gap-2 sm:contents">
              {weekDays.map((day) => (
                <button key={day} type="button" className={cn("h-10 shrink-0 rounded-xl px-3 text-sm", day === focusDay ? "bg-[var(--brand-500)] font-semibold text-white" : "border border-[var(--border)] bg-white")} onClick={() => setFocusDay(day)}>
                  {weekdayShort(new Date(`${day}T12:00:00`).getDay(), lang)} {day.slice(8)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" onClick={() => setMonthOffset((n) => n - 1)}>{t.schedule.prevMonth}</Button>
          <p className="text-sm font-semibold capitalize">{monthTitle}</p>
          <Button variant="outline" onClick={() => setMonthOffset((n) => n + 1)}>{t.schedule.nextMonth}</Button>
        </div>
      )}

      {notice ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}

      {mode === "week" ? (
        <div className="mt-4">
          <div className="overflow-auto rounded-xl border border-[var(--cal-grid)] bg-[var(--card)]">
            <div className="min-w-[720px]">
              <div className="crm-cal-header grid border-b text-xs font-semibold" style={{ gridTemplateColumns: group === "day" ? "56px repeat(7, minmax(0, 1fr))" : `56px repeat(${Math.max(columns.length, 1)}, minmax(148px, 1fr))` }}>
                <div className="p-2 text-slate-400">{t.roomsCal.hour}</div>
                {columns.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setFocusDay(col.day)}
                    className={cn(
                      "crm-cal-line border-l p-2 text-left hover:bg-white",
                      col.day === today && "crm-cal-col-today font-bold text-[var(--foreground)]",
                    )}
                  >
                    <span className="block">{group === "day" ? weekdayShort(new Date(`${col.day}T12:00:00`).getDay(), lang) : col.title}</span>
                    <span className={cn("font-medium", col.day === today ? "text-[var(--foreground)]" : "text-slate-500")}>
                      {group === "day" ? (col.day === today ? t.schedule.today : `${col.day.slice(8)}/${col.day.slice(5, 7)}`) : col.sub}
                    </span>
                  </button>
                ))}
              </div>
              {HOUR_ROWS.map((hour) => {
                const nowFrac = nowLineInHour(hour, nowMin);
                return (
                  <div key={hour} className="crm-cal-line grid border-b text-xs" style={{ gridTemplateColumns: group === "day" ? "56px repeat(7, minmax(0, 1fr))" : `56px repeat(${Math.max(columns.length, 1)}, minmax(148px, 1fr))` }}>
                    <div className={cn("p-2 tabular-nums text-slate-400", nowFrac != null && "font-semibold text-[var(--foreground)]")}>
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {columns.map((col) => {
                      const hits = sessionsIn(col).filter((s) => minutesOf(s.start) < (hour + 1) * 60 && minutesOf(s.end) > hour * 60);
                      const starts = hits.filter((s) => minutesOf(s.start) >= hour * 60);
                      const showNow = col.day === today && nowFrac != null;
                      return (
                        <div
                          key={`${col.id}-${hour}`}
                          data-column={col.id}
                          data-hour={hour}
                          onDragOver={(e) => { if (canEdit) e.preventDefault(); }}
                          onDrop={(e) => void dropOn(e, col)}
                          className={cn(
                            "crm-cal-line relative min-h-12 border-l px-1 py-1 text-left",
                            col.day === today && "crm-cal-col-today",
                            hits.length === 0 ? "crm-cal-cell-free" : "crm-cal-cell-class",
                          )}
                        >
                          {showNow ? (
                            <div
                              className="crm-cal-now"
                              style={{ top: `${nowFrac * 100}%` }}
                              title={t.schedule.now}
                              aria-hidden
                            />
                          ) : null}
                          {starts.map((s) => {
                            const course = courses.find((c) => c.id === s.courseId);
                            const teacher = users.find((u) => u.id === s.teacherId);
                            const room = rooms.find((r) => r.id === s.roomId);
                            const clash = conflictLabel(sessions, s);
                            const phase = sessionTimePhase(s.day, s.start, s.end, { today, nowMin });
                            const movable = canEdit && s.status !== "cancelled" && phase !== "past";
                            return (
                              <button
                                key={s.id}
                                type="button"
                                draggable={movable}
                                onDragStart={(e) => { dragged.current = true; e.dataTransfer.setData("text/session", s.id); e.dataTransfer.effectAllowed = "move"; }}
                                onDragOver={(e) => { if (movable) e.preventDefault(); }}
                                onDragEnd={() => { window.setTimeout(() => { dragged.current = false; }, 0); }}
                                onClick={() => { if (dragged.current) return; setOpenId(s.id); setNotice(""); }}
                                className={cn("relative z-[1] mb-1 block w-full px-1.5 py-1 text-left leading-snug", eventTone(s.status, phase), clash && "ring-1 ring-[var(--cal-cancel-swatch)]")}
                              >
                                {phase === "live" ? (
                                  <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--cal-class-text)]">
                                    <span className="crm-cal-live-dot" aria-hidden />
                                    {t.schedule.live}
                                  </span>
                                ) : null}
                                <span className="block font-semibold tabular-nums">{s.start}–{s.end}</span>
                                <span className="line-clamp-2 font-medium">{course?.name} · {levelLabel(course?.level ?? "")}</span>
                                <span className="block truncate opacity-75">{shortName(teacher?.name ?? "")} · {room?.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.schedule.legendHint}</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-1">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <p key={d} className="px-1 text-center text-xs font-semibold text-slate-400">{d}</p>
          ))}
          {monthCells.map((day, i) => (
            <div key={day ?? `e-${i}`} className={`min-h-24 rounded-xl border p-1.5 ${day === today ? "border-[var(--brand-300)] bg-[var(--cal-header)]" : "border-[var(--cal-grid)] bg-white"}`}>
              {day ? (
                <button type="button" className="text-xs text-slate-500" onClick={() => { setFocusDay(day); setMode("week"); const target = new Date(`${day}T12:00:00`); const current = new Date(`${mondayOf(0)}T12:00:00`); setWeekOffset(Math.floor((target.getTime() - current.getTime()) / (7 * 86400000))); }}>
                  {Number(day.slice(8))}
                </button>
              ) : null}
              {day ? filtered.filter((s) => s.day === day).map((s) => {
                const phase = sessionTimePhase(s.day, s.start, s.end, { today, nowMin });
                return (
                  <button key={s.id} type="button" className={`mt-1 w-full truncate px-1.5 py-0.5 text-left text-[11px] ${eventTone(s.status, phase)}`} onClick={() => setOpenId(s.id)}>
                    {phase === "live" ? "● " : ""}{s.start} {courses.find((c) => c.id === s.courseId)?.name}
                  </button>
                );
              }) : null}
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label={t.common.close} onClick={() => setCreating(false)} />
          <aside className="relative h-full w-[80%] max-w-md overflow-y-auto bg-white p-5">
            <h2 className="text-lg font-bold">{t.schedule.create}</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm"><span className="text-slate-500">{t.schedule.course}</span>
                <select className={`${inputClass} mt-1`} value={draft.courseId} onChange={(e) => {
                  const course = courses.find((c) => c.id === e.target.value);
                  setDraft((d) => ({ ...d, courseId: e.target.value, teacherId: course?.teacherId || d.teacherId, roomId: course?.roomId || d.roomId }));
                }}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="text-slate-500">{t.schedule.day}</span>
                <input className={`${inputClass} mt-1`} type="date" value={draft.day} onChange={(e) => setDraft((d) => ({ ...d, day: e.target.value }))} />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                <label className="block min-w-0 text-sm"><span className="text-slate-500">{t.schedule.start}</span>
                  <input className={`${inputClass} mt-1`} type="time" value={draft.start} onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))} />
                </label>
                <label className="block min-w-0 text-sm"><span className="text-slate-500">{t.schedule.end}</span>
                  <input className={`${inputClass} mt-1`} type="time" value={draft.end} onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))} />
                </label>
              </div>
              <label className="block text-sm"><span className="text-slate-500">{t.common.teacher}</span>
                <select className={`${inputClass} mt-1`} value={draft.teacherId} onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="text-slate-500">{t.common.room}</span>
                <select className={`${inputClass} mt-1`} value={draft.roomId} onChange={(e) => setDraft((d) => ({ ...d, roomId: e.target.value }))}>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{roomWithBranch(r.name, branches.find((b) => b.id === r.branchId)?.name)}</option>)}
                </select>
              </label>
              <Button onClick={() => void createSession()}>{t.schedule.save}</Button>
            </div>
          </aside>
        </div>
      ) : null}

      {filterOpen ? (
        <ScheduleFilterDrawer
          sessions={sessions}
          teachers={teachers}
          rooms={rooms}
          branches={branches}
          courses={courses}
          branchId={branchId}
          selection={selection}
          onToggle={toggleFilter}
          onClear={() => setSelection({ teachers: [], rooms: [], courses: [], statuses: [] })}
          onClose={() => setFilterOpen(false)}
          visibleCount={filtered.length}
        />
      ) : null}

      {openId ? <ClassDrawer classId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
