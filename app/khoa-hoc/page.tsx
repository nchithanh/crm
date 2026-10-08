"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { createCourse, updateCourse } from "@/lib/actions";
import { fill, type Lang } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { sessionStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { weekdayShort } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { ClassSession, Course, Level } from "@/types";

function catalogError(code: string, t: ReturnType<typeof useI18n>["t"]) {
  if (code === "weekday") return t.catalog.needWeekday;
  if (code === "room") return t.catalog.roomBranch;
  if (!code) return "";
  return t.catalog.needFields;
}

export default function CoursesPage() {
  const { lang, t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canManageCatalog(role);
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const teachers = useLiveQuery(() => db.users.where("role").equals("teacher").toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const branch = branchId === "all" ? null : branchId;
  const rows = useMemo(
    () => courses.filter((k) => !branch || k.branchId === branch),
    [courses, branch],
  );
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.pages.courses}</h1>
        {canEdit ? (
          <Button type="button" onClick={() => setCreating((v) => !v)}>{t.catalog.createCourse}</Button>
        ) : (
          <p className="text-sm text-slate-500">{t.catalog.viewOnly}</p>
        )}
      </div>
      {creating && canEdit ? (
        <CourseForm
          teachers={teachers}
          rooms={rooms}
          branches={branches}
          initialBranch={branch ?? branches[0]?.id ?? ""}
          onDone={() => setCreating(false)}
        />
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((k) => (
          <Card key={k.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{k.name}</h2>
              <Badge tone={k.active ? "ok" : "warn"}>{k.active ? t.pages.open : t.pages.pausedCourse}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{k.style} · {levelLabel(k.level)} · {k.slot}</p>
            <p className="mt-1 text-sm text-slate-500">{k.startDay} → {k.endDay}</p>
            <p className="mt-2 text-sm text-slate-600">{k.description}</p>
            <p className="mt-3 text-xs text-slate-400">
              {fill(t.pages.classCount, { n: classes.filter((c) => c.courseId === k.id).length })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreviewId(previewId === k.id ? null : k.id);
                  setEditId(null);
                }}
              >
                {t.catalog.preview}
              </Button>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(editId === k.id ? null : k.id);
                    setPreviewId(null);
                  }}
                >
                  {t.catalog.edit}
                </Button>
              ) : null}
            </div>
            {previewId === k.id ? (
              <CoursePreview
                course={k}
                lang={lang}
                branchName={branches.find((b) => b.id === k.branchId)?.name ?? ""}
                teacherName={teachers.find((teacher) => teacher.id === k.teacherId)?.name ?? ""}
                roomName={rooms.find((r) => r.id === k.roomId)?.name ?? ""}
                sessions={sessions.filter((s) => s.courseId === k.id).sort((a, b) => a.index - b.index)}
              />
            ) : null}
            {canEdit && editId === k.id ? (
              <CourseForm
                course={k}
                teachers={teachers}
                rooms={rooms.filter((r) => r.branchId === k.branchId)}
                branches={branches}
                onDone={() => setEditId(null)}
              />
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function CoursePreview({
  course,
  lang,
  branchName,
  teacherName,
  roomName,
  sessions,
}: {
  course: Course;
  lang: Lang;
  branchName: string;
  teacherName: string;
  roomName: string;
  sessions: ClassSession[];
}) {
  return (
    <div className="mt-3 rounded-[12px] border border-[#E2E8F0] bg-slate-50 p-3 text-sm text-slate-600">
      <p>{branchName} · {teacherName} · {roomName}</p>
      <p className="mt-1">
        {course.weekdays.map((day) => weekdayShort(day, lang)).join(" · ")} · {course.start}–{course.end}
      </p>
      <p className="mt-1">{course.description}</p>
      <ul className="mt-3 space-y-1">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>{s.day} · {s.start}–{s.end}</span>
            <Badge tone={s.status === "cancelled" ? "danger" : s.status === "completed" ? "neutral" : s.status === "ongoing" ? "warn" : "info"}>
              {sessionStatusLabel(s.status, lang)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CourseForm({
  course,
  teachers,
  rooms,
  branches,
  initialBranch = "",
  onDone,
}: {
  course?: Course;
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string; branchId: string }[];
  branches: { id: string; name: string }[];
  initialBranch?: string;
  onDone: () => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState(course?.name ?? "");
  const [style, setStyle] = useState(course?.style ?? "");
  const [level, setLevel] = useState<Level>(course?.level ?? "begin");
  const [branchId, setBranchId] = useState(course?.branchId ?? initialBranch);
  const [teacherId, setTeacherId] = useState(course?.teacherId ?? teachers[0]?.id ?? "");
  const [roomId, setRoomId] = useState(course?.roomId ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(course?.weekdays ?? [1, 3]);
  const [start, setStart] = useState(course?.start ?? "18:00");
  const [end, setEnd] = useState(course?.end ?? "19:30");
  const [description, setDescription] = useState(course?.description ?? "");
  const [active, setActive] = useState(course?.active ?? true);
  const [error, setError] = useState("");
  const roomChoices = rooms.filter((r) => r.branchId === branchId);

  function toggleDay(day: number) {
    setWeekdays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]));
  }

  async function save() {
    const code = course
      ? await updateCourse({ id: course.id, name, style, level, description, teacherId, roomId, start, end, active })
      : await createCourse({ name, style, level, branchId, teacherId, roomId, weekdays, start, end, description });
    const message = catalogError(code, t);
    setError(message);
    if (!message) onDone();
  }

  return (
    <div className="mt-4 grid gap-3 rounded-[12px] border border-[#E2E8F0] bg-slate-50 p-3">
      <Field label={t.common.course}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t.catalog.style}><input className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)} /></Field>
      <Field label={t.common.level}>
        <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          <option value="begin">Begin</option>
          <option value="inter">Inter</option>
          <option value="advance">Advance</option>
        </select>
      </Field>
      {course ? null : (
        <Field label={t.common.branch}>
          <select className={inputClass} value={branchId} onChange={(e) => { setBranchId(e.target.value); setRoomId(""); }}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t.common.teacher}>
        <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
      </Field>
      <Field label={t.common.room}>
        <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">{t.common.choose}</option>
          {roomChoices.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      {course ? null : (
        <div>
          <p className="text-sm text-slate-500">{t.catalog.weekdays}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={weekdays.includes(day) ? "h-9 rounded-[8px] bg-[var(--brand-500)] px-2 text-sm font-semibold text-white" : "h-9 rounded-[8px] border border-[#E2E8F0] bg-white px-2 text-sm"}
              >
                {weekdayShort(day, lang)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.schedule.start}><input className={inputClass} type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={t.schedule.end}><input className={inputClass} type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label={t.catalog.description}><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      {course ? (
        <Button type="button" variant="ghost" onClick={() => setActive((v) => !v)}>{active ? t.catalog.pause : t.catalog.reopen}</Button>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
        <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  );
}
