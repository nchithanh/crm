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
import { initials } from "@/lib/utils";
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

      <ul className="mt-4 space-y-3">
        {rows.map(({ course, classCount, studentCount, main }) => (
          <li key={course.id}>
            <Link href={`/courses/${course.id}`} className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-card)]">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: main?.avatarColor ?? "#7C3AED" }}>
                {initials(main?.name ?? course.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-[var(--foreground)]">{course.name}</span>
                <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">
                  {branches.find((b) => b.id === course.branchId)?.name} · {studentCount}/{course.capacity ?? 12} · {classCount} {t.nav.classes}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="info">{levelLabel(course.level)}</Badge>
                  <Badge tone={course.active ? "ok" : "warn"}>{course.active ? t.pages.open : t.pages.pausedCourse}</Badge>
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
