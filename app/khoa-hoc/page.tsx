"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { levelLabel } from "@/lib/rules";
import { usePageQuery } from "@/lib/page-query";

export default function CoursesPage() {
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const { branch } = usePageQuery();
  const rows = useMemo(
    () => courses.filter((k) => !branch || k.branchId === branch),
    [courses, branch],
  );

  return (
    <div>
      <h1 className="text-xl font-bold">Khóa học</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((k) => (
          <Card key={k.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{k.name}</h2>
              <Badge tone={k.active ? "ok" : "warn"}>{k.active ? "Đang mở" : "Tạm dừng"}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{k.style} · {levelLabel(k.level)} · {k.slot}</p>
            <p className="mt-1 text-sm text-slate-500">{k.startDay} → {k.endDay}</p>
            <p className="mt-2 text-sm text-slate-600">{k.description}</p>
            <p className="mt-3 text-xs text-slate-400">
              {classes.filter((c) => c.courseId === k.id).length} lớp
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
