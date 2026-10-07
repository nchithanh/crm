"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";

export default function PromotionsPage() {
  const rows = useLiveQuery(() => db.promotions.toArray(), []) ?? [];
  return (
    <div>
      <h1 className="text-xl font-bold">Promotion</h1>
      <p className="mt-1 text-sm text-slate-500">Chương trình mẫu của studio. Giá sản phẩm Dolphin CRM vẫn là TODO.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{p.name}</h2>
              <Badge tone={p.active ? "ok" : "warn"}>{p.active ? "Đang chạy" : "Hết hạn"}</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{p.discountLabel}</p>
            <p className="mt-1 text-sm text-slate-500">{p.startDay} → {p.endDay}</p>
            <p className="mt-2 text-sm text-slate-600">{p.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
