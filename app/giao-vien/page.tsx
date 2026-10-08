"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

export default function TeachersPage() {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const teachers = users.filter((u) => u.role === "teacher");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.pages.teachers}</h1>
        {canEdit ? (
          <Button type="button" onClick={() => setCreating((v) => !v)}>{t.catalog.addTeacher}</Button>
        ) : (
          <p className="text-sm text-slate-500">{t.catalog.viewOnly}</p>
        )}
      </div>
      {creating && canEdit ? <TeacherForm onDone={() => setCreating(false)} /> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: teacher.avatarColor }}>
                {initials(teacher.name)}
              </span>
              <div>
                <h2 className="font-bold">{teacher.name}</h2>
                <p className="text-sm text-slate-500">{teacher.phone}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {classes.filter((c) => c.teacherId === teacher.id).map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
            {canEdit ? (
              <Button type="button" variant="outline" className="mt-3" onClick={() => setEditId(editId === teacher.id ? null : teacher.id)}>
                {t.catalog.edit}
              </Button>
            ) : null}
            {canEdit && editId === teacher.id ? <TeacherForm teacher={teacher} onDone={() => setEditId(null)} /> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function TeacherForm({ teacher, onDone }: { teacher?: User; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(teacher?.name ?? "");
  const [phone, setPhone] = useState(teacher?.phone ?? "");
  const [error, setError] = useState("");

  async function save() {
    const code = teacher
      ? await updateTeacher({ id: teacher.id, name, phone })
      : await createTeacher({ name, phone });
    setError(code ? t.catalog.needFields : "");
    if (!code) onDone();
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field label={t.common.teacher}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t.catalog.phone}><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
        <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  );
}
