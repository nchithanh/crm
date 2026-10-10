"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ClassDrawer } from "@/components/class-drawer";
import { Badge, inputClass } from "@/components/ui";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { localDayKey, roomWithBranch } from "@/lib/utils";
import { useStudioBranch } from "@/stores/branch-store";
import type { ClassStatus } from "@/types";

export default function ClassesPage() {
  const { t } = useI18n();
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const classStudents = useLiveQuery(() => db.classStudents.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [status, setStatus] = useState<ClassStatus | "all">("all");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const today = localDayKey();

  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...classes]
      .filter((c) => {
        if (branchId !== "all" && c.branchId !== branchId) return false;
        if (courseId !== "all" && c.courseId !== courseId) return false;
        if (teacherId !== "all" && c.teacherId !== teacherId) return false;
        if (roomId !== "all" && c.roomId !== roomId) return false;
        if (status !== "all" && c.status !== status) return false;
        if (fromDay && c.day < fromDay) return false;
        if (toDay && c.day > toDay) return false;
        if (!s) return true;
        const course = courses.find((k) => k.id === c.courseId);
        const teacher = users.find((u) => u.id === c.teacherId);
        const room = rooms.find((r) => r.id === c.roomId);
        return `${c.name} ${course?.name ?? ""} ${c.day} ${teacher?.name ?? ""} ${room?.name ?? ""}`.toLowerCase().includes(s);
      })
      .sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));
  }, [classes, courses, users, rooms, q, courseId, teacherId, roomId, status, fromDay, toDay, branchId]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.pages.classes}</h1>
          <p className="mt-1 text-sm text-slate-500">{fill(t.pages.classCount, { n: rows.length })}</p>
        </div>
        <Link href="/schedule" className="text-sm font-semibold text-[var(--brand-600)] hover:underline">{t.nav.schedule}</Link>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <input className={`${inputClass} md:col-span-2 xl:col-span-2`} placeholder={t.common.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="all">{t.nav.courses}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="all">{t.nav.teachers}</option>
          {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="all">{t.nav.rooms}</option>
          {rooms.filter((r) => branchId === "all" || r.branchId === branchId).map((r) => (
            <option key={r.id} value={r.id}>{roomWithBranch(r.name, branches.find((b) => b.id === r.branchId)?.name)}</option>
          ))}
        </select>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ClassStatus | "all")}>
          <option value="all">{t.common.status}</option>
          <option value="upcoming">{t.status.upcoming}</option>
          <option value="ongoing">{t.status.ongoing}</option>
          <option value="completed">{t.status.completed}</option>
          <option value="cancelled">{t.status.cancelled}</option>
        </select>
        <input type="date" className={inputClass} value={fromDay} onChange={(e) => setFromDay(e.target.value)} aria-label={t.pages.fromDay} />
        <input type="date" className={inputClass} value={toDay} onChange={(e) => setToDay(e.target.value)} aria-label={t.pages.toDay} />
      </div>

      {openId ? <ClassDrawer classId={openId} onClose={() => setOpenId(null)} /> : null}

      <div className="mt-4 overflow-auto rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.common.class}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.courses}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.teachers}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.rooms}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.students}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.common.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const course = courses.find((k) => k.id === c.courseId);
              const teacher = users.find((u) => u.id === c.teacherId);
              const room = rooms.find((r) => r.id === c.roomId);
              const seated = classStudents.filter((cs) => cs.classId === c.id).length;
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-[var(--brand-50)]"
                  onClick={() => setOpenId(c.id)}
                >
                  <td className="px-3 py-3">
                    <span className="font-semibold text-[var(--brand-600)]">#{c.index} · {c.day}</span>
                    <p className="text-xs text-slate-400">{c.start}–{c.end}{c.day === today ? ` · ${t.common.today}` : ""}</p>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {course ? (
                      <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {teacher ? (
                      <Link href={`/teachers/${teacher.id}`} className="text-[var(--brand-600)] hover:underline">{teacher.name}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{room ? <Link href="/rooms" className="hover:underline" onClick={(e) => e.stopPropagation()}>{room.name}</Link> : "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{seated}/{c.capacity}</td>
                  <td className="px-3 py-3">
                    <Badge tone={c.status === "cancelled" ? "danger" : c.status === "completed" ? "neutral" : c.status === "ongoing" ? "ok" : "info"}>
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
