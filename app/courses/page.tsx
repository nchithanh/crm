"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import { CourseCreateDrawer } from "@/components/course-create-drawer";
import { Badge, Button } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { cn, initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

export default function CoursesPage() {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const teachers = useLiveQuery(() => db.courseTeachers.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.where("role").equals("teacher").toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    return courses
      .filter((c) => branchId === "all" || c.branchId === branchId)
      .map((c) => ({
        course: c,
        classCount: classes.filter((x) => x.courseId === c.id).length,
        studentCount: students.filter((x) => x.courseId === c.id).length,
        teacherCount: teachers.filter((x) => x.courseId === c.id).length,
        main: users.find((u) => u.id === c.teacherId),
      }));
  }, [courses, classes, students, teachers, users, branchId]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.pages.courses}</h1>
          <p className="crm-lead mt-1">{rows.length} · {t.nav.courses}</p>
        </div>
        {canEdit ? <Button type="button" onClick={() => setCreating(true)}>{t.catalog.createCourse}</Button> : null}
      </div>

      {creating && canEdit ? (
        <CourseCreateDrawer
          teachers={users}
          rooms={rooms}
          branches={branches}
          initialBranch={branchId === "all" ? branches[0]?.id ?? "" : branchId}
          onClose={() => setCreating(false)}
        />
      ) : null}

      <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--card)]">
        <li className="hidden items-center gap-x-3 px-4 py-2 text-xs font-semibold text-[var(--muted)] lg:grid lg:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,0.9fr)_minmax(6rem,0.7fr)_minmax(6rem,0.7fr)_5.5rem_4.5rem_5rem_5.5rem]">
          <span>{t.common.course}</span>
          <span>{t.common.teacher}</span>
          <span>{t.common.branch}</span>
          <span>{t.common.room}</span>
          <span>{t.nav.students}</span>
          <span>{t.nav.classes}</span>
          <span>{t.common.level}</span>
          <span>{t.common.status}</span>
        </li>
        {rows.map(({ course, classCount, studentCount, main }) => {
          const room = rooms.find((r) => r.id === course.roomId);
          const branch = branches.find((b) => b.id === course.branchId)?.name ?? "—";
          const cap = course.capacity ?? 12;
          return (
            <li key={course.id}>
              <Link href={`/courses/${course.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-black/5 lg:grid lg:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,0.9fr)_minmax(6rem,0.7fr)_minmax(6rem,0.7fr)_5.5rem_4.5rem_5rem_5.5rem] lg:gap-x-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: main?.avatarColor ?? "#111111" }}>
                    {initials(main?.name ?? course.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-[var(--foreground)]">{course.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-[var(--muted)] lg:hidden">
                      {branch} · {main?.name ?? "—"} · {studentCount}/{cap}
                    </span>
                  </span>
                </span>
                <span className="hidden min-w-0 items-center gap-2 lg:flex">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: main?.avatarColor ?? "#111111" }}>{main ? initials(main.name) : "—"}</span>
                  <span className="truncate text-sm">{main?.name ?? "—"}</span>
                </span>
                <span className="hidden truncate text-sm lg:block">{branch}</span>
                <span className="hidden truncate text-sm lg:block">{room?.name ?? "—"}</span>
                <span className="hidden tabular-nums text-sm lg:block">{studentCount}/{cap}</span>
                <span className="hidden tabular-nums text-sm lg:block">{classCount}</span>
                <span className="hidden lg:block"><Badge tone="info">{levelLabel(course.level)}</Badge></span>
                <span className="mt-2 flex flex-wrap gap-1 lg:mt-0">
                  <span className="lg:hidden"><Badge tone="info">{levelLabel(course.level)}</Badge></span>
                  <Badge tone={course.active ? "ok" : "warn"}>{course.active ? t.pages.open : t.pages.pausedCourse}</Badge>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[var(--muted)] lg:hidden" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
