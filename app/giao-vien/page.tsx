"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { initials } from "@/lib/utils";

export default function TeachersPage() {
  const { t } = useI18n();
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const teachers = users.filter((u) => u.role === "teacher");

  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.teachers}</h1>
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
          </Card>
        ))}
      </div>
    </div>
  );
}
