"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { studentStatusLabel } from "@/lib/labels";
import { weekdayLabel } from "@/lib/utils";

export default function ClassDetailPage() {
  const { lang, t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const klass = useLiveQuery(() => db.classes.get(id), [id]);
  const students = useLiveQuery(() => db.students.where("classId").equals(id).toArray(), [id]) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  if (klass === undefined) return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  if (!klass) return <p>{t.common.notFound}</p>;
  const teacher = users.find((u) => u.id === klass.teacherId);

  return (
    <div>
      <Link href="/lop-hoc" className="text-sm text-slate-500">← Lớp học</Link>
      <h1 className="mt-2 text-xl font-bold">{klass.name}</h1>
      <p className="text-sm text-slate-500">
        {weekdayLabel(klass.weekday, lang)} {klass.start}–{klass.end} · {teacher?.name} · {klass.room} · {students.length}/{klass.capacity}
      </p>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {["Học viên", "Trạng thái", "Buổi còn", ""].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-medium">{s.name}</td>
                <td className="px-3 py-3">{studentStatusLabel(s.status, lang)}</td>
                <td className="px-3 py-3">{s.remainingSessions}</td>
                <td className="px-3 py-3">
                  <Link href={`/hoc-vien/${s.id}`} className="font-semibold text-emerald-700">Hồ sơ</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
