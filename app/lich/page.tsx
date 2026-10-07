"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card } from "@/components/ui";
import { canEditSchedule } from "@/lib/access";
import { cancelSession, updateSession } from "@/lib/actions";
import { db } from "@/lib/db";
import { sessionStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { localDayKey, weekdayLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePageQuery } from "@/lib/page-query";
import type { ClassSession } from "@/types";

function tone(status: ClassSession["status"]) {
  if (status === "ongoing") return "border-emerald-200 bg-emerald-50";
  if (status === "completed") return "border-slate-200 bg-slate-50";
  if (status === "cancelled") return "border-rose-200 bg-rose-50";
  return "border-sky-200 bg-sky-50";
}

export default function SchedulePage() {
  const user = useAuthStore((s) => s.user);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const audits = useLiveQuery(() => db.audits.toArray(), []) ?? [];
  const [mode, setMode] = useState<"week" | "month">("week");
  const [branchId, setBranchId] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { branch } = usePageQuery();
  useEffect(() => {
    if (branch) setBranchId(branch);
  }, [branch]);
  const today = localDayKey();

  const filtered = sessions.filter((s) => {
    if (branchId !== "all" && s.branchId !== branchId) return false;
    if (roomId !== "all" && s.roomId !== roomId) return false;
    if (teacherId !== "all" && s.teacherId !== teacherId) return false;
    if (courseId !== "all" && s.courseId !== courseId) return false;
    return true;
  });
  const open = filtered.find((s) => s.id === openId) ?? sessions.find((s) => s.id === openId) ?? null;

  const weekDays = useMemo(() => {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return localDayKey(d);
    });
  }, []);

  const monthCells = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPad = (first.getDay() + 6) % 7;
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const cells: Array<string | null> = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= days; d++) cells.push(localDayKey(new Date(now.getFullYear(), now.getMonth(), d)));
    return cells;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Lịch</h1>
        <div className="flex gap-2">
          <Button variant={mode === "week" ? "primary" : "outline"} onClick={() => setMode("week")}>Tuần</Button>
          <Button variant={mode === "month" ? "primary" : "outline"} onClick={() => setMode("month")}>Tháng</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="min-h-11 rounded-[12px] border border-slate-200 px-3 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="all">Mọi chi nhánh</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="min-h-11 rounded-[12px] border border-slate-200 px-3 text-sm" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="all">Mọi phòng</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{branches.find((b) => b.id === r.branchId)?.name} · {r.name}</option>)}
        </select>
        <select className="min-h-11 rounded-[12px] border border-slate-200 px-3 text-sm" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="all">Mọi giáo viên</option>
          {users.filter((u) => u.role === "teacher").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="min-h-11 rounded-[12px] border border-slate-200 px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="all">Mọi khóa</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {mode === "week" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {weekDays.map((day) => (
            <section key={day}>
              <h2 className="text-sm font-semibold">{weekdayLabel(new Date(`${day}T12:00:00`).getDay())} {day.slice(5)}{day === today ? " · hôm nay" : ""}</h2>
              <div className="mt-2 space-y-2">
                {filtered.filter((s) => s.day === day).map((s) => (
                  <button key={s.id} type="button" className={`w-full rounded-[12px] border p-3 text-left ${tone(s.status)}`} onClick={() => setOpenId(s.id)}>
                    <p className="text-xs">{s.start} · buổi {s.index}</p>
                    <p className="font-semibold">{courses.find((c) => c.id === s.courseId)?.name}</p>
                    <p className="text-xs text-slate-500">{sessionStatusLabel(s.status)}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-1">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <p key={d} className="px-1 text-center text-xs font-semibold text-slate-400">{d}</p>
          ))}
          {monthCells.map((day, i) => (
            <div key={day ?? `e-${i}`} className="min-h-20 rounded-[12px] border border-slate-100 p-1">
              {day ? <p className="text-xs text-slate-400">{Number(day.slice(8))}</p> : null}
              {day
                ? filtered.filter((s) => s.day === day).map((s) => (
                    <button key={s.id} type="button" className={`mt-1 w-full truncate rounded-[12px] px-1 text-left text-[11px] ${tone(s.status)}`} onClick={() => setOpenId(s.id)}>
                      {s.start} {courses.find((c) => c.id === s.courseId)?.style}
                    </button>
                  ))
                : null}
            </div>
          ))}
        </div>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label="Đóng" onClick={() => setOpenId(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
            <p className="text-xs text-slate-400">Buổi {open.index} · {open.day}</p>
            <h2 className="text-xl font-bold">{courses.find((c) => c.id === open.courseId)?.name}</h2>
            <p className="text-sm text-slate-500">{levelLabel(courses.find((c) => c.id === open.courseId)?.level ?? "")} · {open.start}–{open.end}</p>
            <Badge tone={open.status === "cancelled" ? "danger" : open.status === "completed" ? "neutral" : "info"}>{sessionStatusLabel(open.status)}</Badge>
            {open.note ? <p className="mt-2 text-sm text-rose-600">{open.note}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/diem-danh" className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-4 text-sm font-semibold">Điểm danh</Link>
            </div>
            {canEditSchedule(user?.role) && open.status !== "cancelled" && open.status !== "completed" ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-slate-500">Đổi giáo viên buổi này</span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-[12px] border border-slate-200 px-3"
                    value={open.teacherId}
                    onChange={(e) => user && void updateSession({ sessionId: open.id, actorId: user.id, teacherId: e.target.value })}
                  >
                    {users.filter((u) => u.role === "teacher").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-500">Đổi phòng buổi này</span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-[12px] border border-slate-200 px-3"
                    value={open.roomId}
                    onChange={(e) => user && void updateSession({ sessionId: open.id, actorId: user.id, roomId: e.target.value })}
                  >
                    {rooms.filter((r) => r.branchId === open.branchId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                {user?.role === "owner" ? (
                  <Button variant="outline" onClick={() => void cancelSession(open.id, user.id, "Ốm / lễ")}>Hủy buổi (không trừ credit)</Button>
                ) : null}
              </div>
            ) : null}
            <h3 className="mt-5 text-sm font-semibold">Nhật ký</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {audits.filter((a) => a.sessionId === open.id).map((a) => <li key={a.id}>{a.day} · {a.text}</li>)}
              {audits.filter((a) => a.sessionId === open.id).length === 0 ? <li className="text-slate-400">Chưa có thay đổi.</li> : null}
            </ul>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
