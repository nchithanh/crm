"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { initials, localDayKey } from "@/lib/utils";

export default function TeacherDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const id = String(params?.id ?? "");
  const teacher = useLiveQuery(() => db.users.get(id), [id]);
  const courseTeachers = useLiveQuery(() => db.courseTeachers.where("teacherId").equals(id).toArray(), [id]) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.where("teacherId").equals(id).toArray(), [id]) ?? [];
  const today = localDayKey();

  const linkedCourses = useMemo(
    () => courseTeachers.map((ct) => ({ ct, course: courses.find((c) => c.id === ct.courseId) })).filter((x) => x.course),
    [courseTeachers, courses],
  );
  const upcoming = useMemo(
    () => [...classes].filter((c) => c.day >= today && c.status !== "cancelled").sort((a, b) => a.day.localeCompare(b.day)).slice(0, 20),
    [classes, today],
  );

  if (teacher === undefined) return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  if (!teacher || teacher.role !== "teacher") return <p className="text-sm text-slate-500">{t.common.notFound}</p>;

  return (
    <div>
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/teachers" className="font-semibold text-[var(--brand-600)] hover:underline">{t.nav.teachers}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{teacher.name}</span>
      </nav>

      <header className="mt-3 flex items-center gap-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: teacher.avatarColor }}>
          {initials(teacher.name)}
        </span>
        <div>
          <h1 className="crm-page-title">{teacher.name}</h1>
          <p className="text-sm text-slate-500">{teacher.phone}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={(teacher.teacherStatus ?? "active") === "active" ? "ok" : "warn"}>{teacher.teacherStatus ?? "active"}</Badge>
            {(teacher.styles ?? []).map((s) => <Badge key={s} tone="info">{s}</Badge>)}
          </div>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-base font-bold">{t.nav.courses} ({linkedCourses.length})</h2>
        <ul className="mt-2 space-y-2">
          {linkedCourses.map(({ ct, course }) => (
            <li key={ct.id}>
              <Link href={`/courses/${course!.id}`} className="flex items-center justify-between rounded-[12px] border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[var(--brand-300)]">
                <span className="font-semibold text-slate-900">{course!.name}</span>
                <Badge tone={ct.role === "main" ? "ok" : "info"}>{ct.role}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold">Upcoming classes ({upcoming.length})</h2>
        <ul className="mt-2 space-y-2">
          {upcoming.map((c) => (
            <li key={c.id}>
              <Link href={`/classes/${c.id}`} className="block rounded-[12px] border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[var(--brand-300)]">
                <span className="font-semibold text-slate-900">{c.name}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{c.day} · {c.start}–{c.end}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
