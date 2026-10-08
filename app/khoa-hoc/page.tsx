"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { useStudioBranch } from "@/stores/branch-store";

export default function CoursesPage() {
  const { t } = useI18n();
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const branch = branchId === "all" ? null : branchId;
  const rows = useMemo(
    () => courses.filter((k) => !branch || k.branchId === branch),
    [courses, branch],
  );

  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.courses}</h1>
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
          </Card>
        ))}
      </div>
    </div>
  );
}
