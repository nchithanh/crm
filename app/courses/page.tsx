"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CourseCreateDrawer } from "@/components/course-create-drawer";
import { Badge, Button } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
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

      <div className="mt-4 overflow-auto rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.courses}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.common.branch}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.classes}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.catalog.capacityCurrent}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.catalog.capacityMax}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.nav.teachers}</th>
              <th className="px-3 py-3 font-semibold text-slate-600">Main</th>
              <th className="px-3 py-3 font-semibold text-slate-600">{t.common.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ course, classCount, studentCount, teacherCount, main }) => (
              <tr key={course.id} className="border-t border-slate-100 hover:bg-[var(--brand-50)]">
                <td className="px-3 py-3">
                  <Link href={`/courses/${course.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">
                    {course.name}
                  </Link>
                  <p className="text-xs text-slate-400">{course.style} · {levelLabel(course.level)} · {course.slot}</p>
                </td>
                <td className="px-3 py-3 text-slate-600">{branches.find((b) => b.id === course.branchId)?.name}</td>
                <td className="px-3 py-3">
                  <Link href={`/courses/${course.id}`} className="tabular-nums font-semibold text-slate-800 hover:underline">{classCount}</Link>
                </td>
                <td className="px-3 py-3 tabular-nums">{studentCount}</td>
                <td className="px-3 py-3 tabular-nums">{course.capacity ?? 12}</td>
                <td className="px-3 py-3 tabular-nums">{teacherCount}</td>
                <td className="px-3 py-3">
                  {main ? (
                    <Link href={`/teachers/${main.id}`} className="text-[var(--brand-600)] hover:underline">{main.name}</Link>
                  ) : "—"}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={course.active ? "ok" : "warn"}>{course.active ? t.pages.open : t.pages.pausedCourse}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
