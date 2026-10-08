"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { setAttendance } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { AttendStatus } from "@/types";

export default function ClassDetailPage() {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const params = useParams();
  const id = String(params?.id ?? "");
  const klass = useLiveQuery(() => db.classes.get(id), [id]);
  const course = useLiveQuery(() => (klass ? db.courses.get(klass.courseId) : undefined), [klass?.courseId]);
  const teacher = useLiveQuery(() => (klass?.teacherId ? db.users.get(klass.teacherId) : undefined), [klass?.teacherId]);
  const room = useLiveQuery(() => (klass?.roomId ? db.rooms.get(klass.roomId) : undefined), [klass?.roomId]);
  const roster = useLiveQuery(() => db.classStudents.where("classId").equals(id).toArray(), [id]) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.where("classId").equals(id).toArray(), [id]) ?? [];
  const [attendMsg, setAttendMsg] = useState("");

  if (klass === undefined) return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  if (!klass) return <p className="text-sm text-slate-500">{t.common.notFound}</p>;

  const rosterStudents = roster
    .map((cs) => students.find((s) => s.id === cs.studentId))
    .filter(Boolean);

  async function mark(studentId: string, status: AttendStatus) {
    const code = await setAttendance({ classId: id, personId: studentId, subject: "student", status });
    setAttendMsg(code === "subscription" ? t.pages.subInvalid : "");
  }

  async function markTeacher(status: AttendStatus) {
    if (!klass?.teacherId) return;
    await setAttendance({ classId: id, personId: klass.teacherId, subject: "teacher", status });
  }

  const teacherMark = attendance.find((a) => a.subject === "teacher" && a.personId === klass.teacherId);

  return (
    <div>
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        {course ? (
          <>
            <Link href={`/courses/${course.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">{course.name}</Link>
            <span className="mx-1.5">/</span>
          </>
        ) : (
          <>
            <Link href="/classes" className="font-semibold text-[var(--brand-600)] hover:underline">{t.nav.classes}</Link>
            <span className="mx-1.5">/</span>
          </>
        )}
        <span className="text-slate-800">#{klass.index} · {klass.day}</span>
      </nav>

      <header className="mt-3">
        <h1 className="crm-page-title">{klass.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{klass.day} · {klass.start}–{klass.end}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {teacher ? (
            <Link href={`/teachers/${teacher.id}`} className="rounded-[8px] bg-slate-100 px-2 py-1 font-medium text-[var(--brand-700)] hover:underline">
              GV: {teacher.name}
            </Link>
          ) : null}
          {room ? (
            <Link href="/rooms" className="rounded-[8px] bg-slate-100 px-2 py-1 text-slate-700 hover:underline">
              {room.name}
            </Link>
          ) : (
            <span className="rounded-[8px] bg-amber-50 px-2 py-1 text-amber-700">No room</span>
          )}
          <Badge tone={klass.status === "cancelled" ? "danger" : "ok"}>{klass.status}</Badge>
        </div>
      </header>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">Điểm danh giáo viên</h2>
          {canEdit ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void markTeacher("present")}>Có mặt</Button>
              <Button type="button" variant="ghost" onClick={() => void markTeacher("absent")}>Vắng</Button>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-600">{teacherMark ? teacherMark.status : "Chưa điểm danh GV"}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold">{t.nav.students} ({rosterStudents.length}/{klass.capacity})</h2>
        {attendMsg ? <p className="mt-2 text-sm text-rose-700">{attendMsg}</p> : null}
        <ul className="mt-3 space-y-2">
          {rosterStudents.map((s) => {
            if (!s) return null;
            const markRow = attendance.find((a) => a.subject === "student" && a.personId === s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-2.5">
                <Link href={`/students/${s.id}`} className="flex items-center gap-2 font-semibold text-[var(--brand-600)] hover:underline">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.avatarColor }}>{initials(s.name)}</span>
                  {s.name}
                </Link>
                <div className="flex items-center gap-2">
                  {markRow ? <Badge tone={markRow.status === "present" ? "ok" : "warn"}>{markRow.status}</Badge> : <Badge tone="neutral">—</Badge>}
                  {canEdit ? (
                    <>
                      <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => void mark(s.id, "present")}>Present</button>
                      <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void mark(s.id, "absent")}>Absent</button>
                      <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => void mark(s.id, "excused")}>Excused</button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
