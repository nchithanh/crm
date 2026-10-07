"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";

export default function HoldsPage() {
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  return (
    <div>
      <h1 className="text-xl font-bold">Bảo lưu</h1>
      <div className="mt-4 space-y-3">
        {holds.map((h) => (
          <Card key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{students.find((s) => s.id === h.studentId)?.name}</p>
              <p className="text-sm text-slate-500">{h.fromDay} → {h.toDay}</p>
              <p className="text-sm text-slate-600">{h.reason}</p>
            </div>
            <Badge tone={h.status === "active" ? "warn" : "ok"}>{h.status === "active" ? "Đang bảo lưu" : "Đã hết"}</Badge>
          </Card>
        ))}
        {holds.length === 0 ? <p className="text-sm text-slate-500">Chưa có bảo lưu.</p> : null}
      </div>
    </div>
  );
}
