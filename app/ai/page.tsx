"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { formatVnd, localDayKey } from "@/lib/utils";

export default function AiPage() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const today = localDayKey();
  const overdue = tasks.filter((t) => !t.done && t.day < today);
  const debtors = students.filter((s) => s.debt > 0);

  return (
    <div>
      <h1 className="text-xl font-bold">AI vận hành</h1>
      <p className="mt-1 text-sm text-slate-500">Chưa nối mô hình. Gợi ý dưới đây chỉ đọc dữ liệu mẫu trên máy.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold">Tác vụ quá hạn</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {overdue.length === 0 ? <li className="text-slate-500">Không có tác vụ quá hạn.</li> : null}
            {overdue.map((t) => <li key={t.id}>{t.title} · {t.day}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Học viên còn nợ</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {debtors.map((s) => <li key={s.id}>{s.name} · {formatVnd(s.debt)}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
