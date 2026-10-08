"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatVnd, localDayKey } from "@/lib/utils";

export default function AiPage() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const today = localDayKey();
  const overdue = tasks.filter((t) => t.status !== "done" && t.dueDay < today);
  const debtors = students.filter((s) => s.debt > 0);

  return (
    <div>
      <h1 className="crm-page-title inline-flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--brand-50)] text-[var(--brand-600)]">
          <Sparkles size={18} aria-hidden />
        </span>
        {t.pages.ai}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.aiLead}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold">{t.pages.overdueTasks}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {overdue.length === 0 ? <li className="text-slate-500">{t.pages.noOverdue}</li> : null}
            {overdue.map((t) => <li key={t.id}>{t.title} · {t.dueDay}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">{t.pages.debtors}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {debtors.map((s) => <li key={s.id}>{s.name} · {formatVnd(s.debt)}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
