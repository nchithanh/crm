"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, ctaOutline, inputClass, inputClassInline } from "@/components/ui";
import { canEditSchedule } from "@/lib/access";
import { addOneOffSession, cancelSession, moveSession, syncSessionClock, updateSession } from "@/lib/actions";
import { db } from "@/lib/db";
import { sessionStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { conflictLabel, formatMinutes, GRID_END, GRID_START, minutesOf } from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";
import { localDayKey, weekdayLabel, weekdayShort } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { ClassSession, SessionStatus } from "@/types";

const HOUR_PX = 52;
const HOURS = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i);

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

function tone(status: SessionStatus) {
  if (status === "ongoing") return "border-l-4 border-[var(--brand-500)] bg-[var(--brand-100)] text-[#0F172A]";
  if (status === "completed") return "border-l-4 border-slate-300 bg-slate-100 text-slate-500";
  if (status === "cancelled") return "border-l-4 border-[#DC2626] bg-rose-50 text-rose-800";
  return "border-l-4 border-sky-500 bg-sky-50 text-sky-950";
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
  const audits = useLiveQuery(() => Promise.resolve([] as { id: string; sessionId?: string; day: string; text: string }[]), []) ?? [];
  const [mode, setMode] = useState<"week" | "month">("week");
  const [group, setGroup] = useState<Group>("day");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { branchId } = useStudioBranch();
  const [roomId, setRoomId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [status, setStatus] = useState<SessionStatus | "all">("all");
  const [focusDay, setFocusDay] = useState(localDayKey());
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState({ courseId: "", day: localDayKey(), start: "18:00", end: "19:30", teacherId: "", roomId: "" });
  const dragged = useRef(false);
  const today = localDayKey();

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

  const filtered = sessions.filter((s) => {
    if (branchId !== "all" && s.branchId !== branchId) return false;
    if (roomId !== "all" && s.roomId !== roomId) return false;
    if (teacherId !== "all" && s.teacherId !== teacherId) return false;
    if (courseId !== "all" && s.courseId !== courseId) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  });
  const open = sessions.find((s) => s.id === openId) ?? null;

  const columns: Column[] = useMemo(() => {
    if (group === "room") {
      return rooms
        .filter((r) => (branchId === "all" || r.branchId === branchId) && (roomId === "all" || r.id === roomId))
        .map((r) => ({ id: r.id, day: focusDay, title: r.name, sub: branches.find((b) => b.id === r.branchId)?.name ?? "", roomId: r.id }));
    }
    if (group === "teacher") {
      return teachers
        .filter((t) => teacherId === "all" || t.id === teacherId)
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
  }, [group, rooms, teachers, branches, weekDays, focusDay, branchId, roomId, teacherId, today, lang, t]);

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
    const column = (event.currentTarget as HTMLElement).closest("[data-column]") as HTMLElement | null;
    if (!session || !user || !canEdit || !column) return;
    const bounds = column.getBoundingClientRect();
    const y = event.clientY - bounds.top;
    let startMin = GRID_START * 60 + Math.round(((y / HOUR_PX) * 60) / 30) * 30;
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

  const gridHeight = (GRID_END - GRID_START) * HOUR_PX;
  const monthTitle = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.schedule.title}</h1>
          <p className="text-sm text-slate-500">{group === "day" ? `${weekDays[0].slice(8)}/${weekDays[0].slice(5, 7)} – ${weekDays[6].slice(8)}/${weekDays[6].slice(5, 7)}` : focusDay}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "week" ? "primary" : "outline"} onClick={() => setMode("week")}>{t.schedule.week}</Button>
          <Button variant={mode === "month" ? "primary" : "outline"} onClick={() => setMode("month")}>{t.schedule.month}</Button>
          {canEdit ? <Button variant="outline" onClick={() => { setDraft((d) => ({ ...d, courseId: d.courseId || courses[0]?.id || "", teacherId: d.teacherId || teachers[0]?.id || "", roomId: d.roomId || rooms[0]?.id || "", day: focusDay })); setCreating(true); }}>{t.schedule.create}</Button> : null}
          <Button variant="ghost" onClick={exportCsv}>{t.schedule.export}</Button>
          <Button variant="ghost" onClick={() => void syncView()}>{t.schedule.sync}</Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select className={inputClassInline} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="all">{t.common.room}</option>
          {rooms.filter((r) => branchId === "all" || r.branchId === branchId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className={inputClassInline} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="all">{t.common.teacher}</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={inputClassInline} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="all">{t.common.course}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={inputClassInline} value={status} onChange={(e) => setStatus(e.target.value as SessionStatus | "all")}>
          <option value="all">{t.common.status}</option>
          <option value="upcoming">{t.status.upcoming}</option>
          <option value="ongoing">{t.status.ongoing}</option>
          <option value="completed">{t.status.completed}</option>
          <option value="cancelled">{t.status.cancelled}</option>
        </select>
      </div>

      {mode === "week" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setWeekOffset((n) => n - 1)}>{t.schedule.prevWeek}</Button>
          <Button variant="ghost" onClick={() => setWeekOffset((n) => n + 1)}>{t.schedule.nextWeek}</Button>
          {(["room", "teacher", "branch"] as const).map((key) => (
            <Button key={key} variant={group === key ? "primary" : "outline"} onClick={() => setGroup((g) => (g === key ? "day" : key))}>
              {key === "room" ? t.schedule.byRoom : key === "teacher" ? t.schedule.byTeacher : t.schedule.byBranch}
            </Button>
          ))}
          {group !== "day" ? weekDays.map((day) => (
            <button key={day} type="button" className={day === focusDay ? "h-10 rounded-[10px] bg-[var(--brand-500)] px-3 text-sm font-semibold text-white" : "h-10 rounded-[10px] border border-[#E2E8F0] bg-white px-3 text-sm"} onClick={() => setFocusDay(day)}>
              {weekdayShort(new Date(`${day}T12:00:00`).getDay(), lang)} {day.slice(8)}
            </button>
          )) : null}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" onClick={() => setMonthOffset((n) => n - 1)}>{t.schedule.prevMonth}</Button>
          <p className="text-sm font-semibold capitalize">{monthTitle}</p>
          <Button variant="outline" onClick={() => setMonthOffset((n) => n + 1)}>{t.schedule.nextMonth}</Button>
        </div>
      )}

      {notice ? <p className="mt-3 rounded-[12px] bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}

      {mode === "week" ? (
        <div className="mt-4 max-h-[72dvh] overflow-auto rounded-[12px] border border-slate-200 bg-white">
          <div className="flex min-w-[760px]">
            <div className="sticky left-0 z-20 w-14 shrink-0 bg-white">
              <div className="sticky top-0 h-12 border-b border-slate-100 bg-white" />
              <div className="relative" style={{ height: gridHeight }}>
                {HOURS.slice(0, -1).map((hour) => (
                  <div key={hour} className="absolute right-1 text-[11px] text-slate-400" style={{ top: (hour - GRID_START) * HOUR_PX - 6 }}>{String(hour).padStart(2, "0")}:00</div>
                ))}
              </div>
            </div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(148px, 1fr))` }}>
              {columns.map((col) => (
                <div key={col.id} className="sticky top-0 z-10 flex h-12 flex-col justify-center border-b border-l border-slate-100 bg-white px-2">
                  <p className="text-sm font-semibold">{col.title}</p>
                  <p className="text-xs text-slate-400">{col.sub}</p>
                </div>
              ))}
              {columns.map((col) => (
                <div
                  key={`${col.id}-body`}
                  data-column={col.id}
                  className="relative border-l border-slate-100"
                  style={{ height: gridHeight }}
                  onDragOver={(e) => { if (canEdit) e.preventDefault(); }}
                  onDrop={(e) => void dropOn(e, col)}
                >
                  {HOURS.slice(0, -1).map((hour) => (
                    <div key={hour} className="absolute inset-x-0 border-t border-slate-100" style={{ top: (hour - GRID_START) * HOUR_PX }} />
                  ))}
                  {col.day === today ? <div className="absolute inset-x-0 z-[1] h-px bg-[var(--brand-500)]" style={{ top: Math.min(gridHeight, Math.max(0, ((new Date().getHours() * 60 + new Date().getMinutes() - GRID_START * 60) / 60) * HOUR_PX)) }} /> : null}
                  {sessionsIn(col).map((s) => {
                    const course = courses.find((c) => c.id === s.courseId);
                    const teacher = users.find((u) => u.id === s.teacherId);
                    const room = rooms.find((r) => r.id === s.roomId);
                    const cap = classes.find((c) => c.id === s.classId)?.capacity ?? 0;
                    const top = ((minutesOf(s.start) - GRID_START * 60) / 60) * HOUR_PX;
                    const height = Math.max(36, ((minutesOf(s.end) - minutesOf(s.start)) / 60) * HOUR_PX - 4);
                    const clash = conflictLabel(sessions, s);
                    const movable = canEdit && s.status !== "cancelled" && s.status !== "completed";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        draggable={movable}
                        onDragStart={(e) => { dragged.current = true; e.dataTransfer.setData("text/session", s.id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragOver={(e) => { if (movable) e.preventDefault(); }}
                        onDrop={(e) => { e.stopPropagation(); void dropOn(e, col); }}
                        onDragEnd={() => { window.setTimeout(() => { dragged.current = false; }, 0); }}
                        onClick={() => { if (dragged.current) return; setOpenId(s.id); setReason(""); setNotice(""); }}
                        className={`absolute inset-x-1 overflow-hidden rounded-[10px] border border-[#E2E8F0] px-2 py-1 text-left text-[11px] leading-snug shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${tone(s.status)} ${clash ? "ring-2 ring-rose-400" : ""}`}
                        style={{ top: top + 2, height }}
                      >
                        <p className="font-semibold tabular-nums">{s.start}–{s.end}</p>
                        <p className="truncate font-medium">{course?.name} · {levelLabel(course?.level ?? "")}</p>
                        {height > 52 ? <p className="truncate text-slate-600">{shortName(teacher?.name ?? "")} · {room?.name}</p> : null}
                        {height > 68 ? <p>{seated(s.id ?? "")}/{cap}{clash ? ` · ${clash}` : ""}</p> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-1">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <p key={d} className="px-1 text-center text-xs font-semibold text-slate-400">{d}</p>
          ))}
          {monthCells.map((day, i) => (
            <div key={day ?? `e-${i}`} className={`min-h-24 rounded-[12px] border p-1 ${day === today ? "border-[var(--brand-500)]" : "border-slate-100"}`}>
              {day ? (
                <button type="button" className="text-xs text-slate-500" onClick={() => { setFocusDay(day); setMode("week"); const target = new Date(`${day}T12:00:00`); const current = new Date(`${mondayOf(0)}T12:00:00`); setWeekOffset(Math.floor((target.getTime() - current.getTime()) / (7 * 86400000))); }}>
                  {Number(day.slice(8))}
                </button>
              ) : null}
              {day ? filtered.filter((s) => s.day === day).map((s) => (
                <button key={s.id} type="button" className={`mt-1 w-full truncate rounded-[8px] border px-1 text-left text-[11px] ${tone(s.status)}`} onClick={() => { setOpenId(s.id); setReason(""); }}>
                  {s.start} {courses.find((c) => c.id === s.courseId)?.name}
                </button>
              )) : null}
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label={t.common.close} onClick={() => setCreating(false)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
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
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <Button onClick={() => void createSession()}>{t.schedule.save}</Button>
            </div>
          </aside>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label={t.common.close} onClick={() => setOpenId(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
            <p className="text-xs text-slate-400">{t.schedule.session} {open.index} · {open.day}</p>
            <h2 className="crm-page-title">{courses.find((c) => c.id === open.courseId)?.name}</h2>
            <p className="text-sm text-slate-500">{levelLabel(courses.find((c) => c.id === open.courseId)?.level ?? "")} · {open.start}–{open.end}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={open.status === "cancelled" ? "danger" : open.status === "completed" ? "neutral" : open.status === "ongoing" ? "warn" : "info"}>{sessionStatusLabel(open.status, lang)}</Badge>
              {conflictLabel(sessions, open) ? <Badge tone="danger">{conflictLabel(sessions, open)}</Badge> : null}
            </div>
            {open.note ? <p className="mt-2 text-sm text-rose-600">{open.note}</p> : null}
            <h3 className="mt-4 text-sm font-semibold">{t.schedule.roster} {seated(open.id)}/{classes.find((c) => c.id === open.id)?.capacity ?? open.capacity}</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {students.filter((st) => st.classId === open.classId).map((st) => <li key={st.id}>{st.name}</li>)}
              {students.filter((st) => st.classId === open.classId).length === 0 ? <li className="text-slate-400">{t.schedule.emptyClass}</li> : null}
            </ul>
            <Link href={`/diem-danh?branch=${open.branchId}&class=${open.classId}`} className={`${ctaOutline} mt-4`}>{t.schedule.attend}</Link>
            {canEdit && open.status !== "cancelled" && open.status !== "completed" ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-slate-500">{t.schedule.changeTeacher}</span>
                  <select className={`${inputClass} mt-1`} value={open.teacherId} onChange={(e) => user && void updateSession({ sessionId: open.id, actorId: user.id, teacherId: e.target.value }).then(setNotice)}>
                    {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-500">{t.schedule.changeRoom}</span>
                  <select className={`${inputClass} mt-1`} value={open.roomId} onChange={(e) => user && void updateSession({ sessionId: open.id, actorId: user.id, roomId: e.target.value }).then(setNotice)}>
                    {rooms.filter((r) => r.branchId === open.branchId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                {user?.role === "owner" ? (
                  <div>
                    <input className={inputClass} placeholder={t.schedule.cancelReason} value={reason} onChange={(e) => setReason(e.target.value)} />
                    <Button className="mt-2" variant="outline" onClick={() => void cancelSession(open.id, user.id, reason || t.schedule.cancel).then(() => setOpenId(null))}>{t.schedule.cancel}</Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <h3 className="mt-5 text-sm font-semibold">{t.schedule.log}</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {audits.filter((a) => a.sessionId === open.id).map((a) => <li key={a.id}>{a.day} · {a.text}</li>)}
              {audits.filter((a) => a.sessionId === open.id).length === 0 ? <li className="text-slate-400">{t.schedule.noChanges}</li> : null}
            </ul>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
