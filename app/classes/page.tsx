"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, inputClass } from "@/components/ui";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { localDayKey } from "@/lib/utils";
import { useStudioBranch } from "@/stores/branch-store";

export default function ClassesPage() {
  const { t } = useI18n();
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const classStudents = useLiveQuery(() => db.classStudents.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState("all");
  const today = localDayKey();

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...classes]
      .filter((c) => {
        if (branchId !== "all" && c.branchId !== branchId) return false;
        if (courseId !== "all" && c.courseId !== courseId) return false;
        if (!s) return true;
        const course = courses.find((k) => k.id === c.courseId);
        return `${c.name} ${course?.name ?? ""} ${c.day}`.toLowerCase().includes(s);
      })
      .sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));
  }, [classes, courses, q, courseId, branchId]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.pages.classes}</h1>
          <p className="mt-1 text-sm text-slate-500">{fill(t.pages.classCount, { n: rows.length })} · buổi học</p>
        </div>
        <Link href="/schedule" className="text-sm font-semibold text-[var(--brand-600)] hover:underline">{t.nav.schedule}</Link>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <input className={`${inputClass} md:col-span-2`} placeholder={t.common.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="all">{t.nav.courses}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-3 font-semibold text-slate-600">Buổi</th>
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
                <tr key={c.id} className="border-t border-slate-100 hover:bg-[var(--brand-50)]">
                  <td className="px-3 py-3">
                    <Link href={`/classes/${c.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">
                      #{c.index} · {c.day}
                    </Link>
                    <p className="text-xs text-slate-400">{c.start}–{c.end}{c.day === today ? " · today" : ""}</p>
                  </td>
                  <td className="px-3 py-3">
                    {course ? (
                      <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {teacher ? (
                      <Link href={`/teachers/${teacher.id}`} className="text-[var(--brand-600)] hover:underline">{teacher.name}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{room ? <Link href="/rooms" className="hover:underline">{room.name}</Link> : "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{seated}/{c.capacity}</td>
                  <td className="px-3 py-3"><Badge tone={c.status === "cancelled" ? "danger" : c.status === "completed" ? "neutral" : "ok"}>{c.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
