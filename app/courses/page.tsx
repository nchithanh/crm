"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { createCourse } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { weekdayShort } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Level } from "@/types";

export default function CoursesPage() {
  const { lang, t } = useI18n();
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
          <p className="crm-lead mt-1">{fill(t.pages.classCount, { n: rows.length }).replace("lớp", "khóa")}</p>
        </div>
        {canEdit ? <Button type="button" onClick={() => setCreating((v) => !v)}>{t.catalog.createCourse}</Button> : null}
      </div>

      {creating && canEdit ? (
        <CourseCreateForm
          teachers={users}
          rooms={rooms}
          branches={branches}
          initialBranch={branchId === "all" ? branches[0]?.id ?? "" : branchId}
          onDone={() => setCreating(false)}
        />
      ) : null}

      <div className="mt-4 overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
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

function CourseCreateForm({
  teachers,
  rooms,
  branches,
  initialBranch,
  onDone,
}: {
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string; branchId: string }[];
  branches: { id: string; name: string }[];
  initialBranch: string;
  onDone: () => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState<Level>("begin");
  const [branchId, setBranchId] = useState(initialBranch);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:30");
  const [capacity, setCapacity] = useState("12");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function toggleDay(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function save() {
    const seats = Math.max(1, Math.round(Number(capacity) || 12));
    const code = await createCourse({
      name,
      style: style || name,
      level,
      branchId,
      teacherId,
      roomId: roomId || undefined,
      weekdays,
      start,
      end,
      description,
      capacity: seats,
    });
    if (code) {
      setError(code === "weekday" ? t.catalog.needWeekday : code === "room" ? t.catalog.roomBranch : t.catalog.needFields);
      return;
    }
    onDone();
  }

  const branchRooms = rooms.filter((r) => r.branchId === branchId);

  return (
    <div className="mt-4 space-y-3 rounded-[12px] border border-[#E2E8F0] bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t.common.course}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t.catalog.style}><input className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)} /></Field>
        <Field label={t.common.level}>
          <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="begin">Begin</option>
            <option value="inter">Inter</option>
            <option value="advance">Advance</option>
          </select>
        </Field>
        <Field label={t.common.branch}>
          <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label={t.common.teacher}>
          <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label={`${t.common.room} (optional)`}>
          <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">—</option>
            {branchRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label={t.schedule.start}><input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={t.schedule.end}><input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        <Field label={t.catalog.capacity}>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClass}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Field>
      </div>
      <div>
        <p className="text-sm text-slate-500">{t.catalog.weekdays}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={weekdays.includes(d) ? "rounded-[8px] border border-[var(--brand-500)] bg-[var(--brand-50)] px-2.5 py-1.5 text-sm font-medium" : "rounded-[8px] border border-[#E2E8F0] px-2.5 py-1.5 text-sm"}
            >
              {weekdayShort(d, lang)}
            </button>
          ))}
        </div>
      </div>
      <Field label={t.catalog.description}>
        <textarea className={`${inputClass} h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
        <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  );
}
