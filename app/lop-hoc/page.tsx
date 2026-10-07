"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { weekdayLabel } from "@/lib/utils";

export default function ClassesPage() {
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold">Lớp học</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id && s.status !== "paused").length;
          return (
            <Link key={c.id} href={`/lop-hoc/${c.id}`}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400">{courses.find((k) => k.id === c.courseId)?.name}</p>
                    <h2 className="text-lg font-bold">{c.name}</h2>
                  </div>
                  <Badge tone={count >= c.capacity ? "warn" : "ok"}>{count}/{c.capacity}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {weekdayLabel(c.weekday)} · {c.start}–{c.end}
                </p>
                <p className="text-sm text-slate-500">
                  {users.find((u) => u.id === c.teacherId)?.name} · {c.room}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
