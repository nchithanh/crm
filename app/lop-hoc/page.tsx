"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, ctaOutline, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { updateClass } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { weekdayLabel } from "@/lib/utils";
import { levelLabel } from "@/lib/rules";
import { useAuthStore } from "@/stores/auth-store";
import type { DanceClass } from "@/types";

export default function ClassesPage() {
  const { lang, t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const teachers = users.filter((u) => u.role === "teacher");
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.pages.classes}</h1>
        {canEdit ? null : <p className="text-sm text-slate-500">{t.catalog.viewOnly}</p>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id && s.status !== "paused").length;
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400">{courses.find((k) => k.id === c.courseId)?.name}</p>
                  <h2 className="text-lg font-bold">
                    <Link href={`/lop-hoc/${c.id}`}>{c.name}</Link>
                  </h2>
                </div>
                <Badge tone={count >= c.capacity ? "warn" : "ok"}>{count}/{c.capacity}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {weekdayLabel(c.weekday, lang)} · {c.start}–{c.end} · {levelLabel(c.level)}
              </p>
              <p className="text-sm text-slate-500">
                {users.find((u) => u.id === c.teacherId)?.name} · {c.room}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/lop-hoc/${c.id}`} className={ctaOutline}>{t.catalog.preview}</Link>
                {canEdit ? (
                  <Button type="button" variant="outline" onClick={() => setEditId(editId === c.id ? null : c.id)}>
                    {t.catalog.edit}
                  </Button>
                ) : null}
              </div>
              {canEdit && editId === c.id ? (
                <ClassForm
                  klass={c}
                  teachers={teachers}
                  rooms={rooms.filter((r) => r.branchId === c.branchId)}
                  onDone={() => setEditId(null)}
                />
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ClassForm({
  klass,
  teachers,
  rooms,
  onDone,
}: {
  klass: DanceClass;
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [capacity, setCapacity] = useState(String(klass.capacity));
  const [teacherId, setTeacherId] = useState(klass.teacherId);
  const [roomId, setRoomId] = useState(klass.roomId);
  const [start, setStart] = useState(klass.start);
  const [end, setEnd] = useState(klass.end);
  const [error, setError] = useState("");

  async function save() {
    const code = await updateClass({
      id: klass.id,
      capacity: Number(capacity) || 0,
      teacherId,
      roomId,
      start,
      end,
    });
    setError(code === "room" ? t.catalog.roomBranch : code ? t.catalog.needFields : "");
    if (!code) onDone();
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field label={t.catalog.capacity}><input className={inputClass} type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
      <Field label={t.common.teacher}>
        <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
      </Field>
      <Field label={t.common.room}>
        <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
        <Field label={t.schedule.start}><input className={inputClass} type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={t.schedule.end}><input className={inputClass} type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
        <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  );
}
