"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export default function PromotionsPage() {
  const { t } = useI18n();
  const rows = useLiveQuery(() => db.promotions.toArray(), []) ?? [];
  return (
    <div>
      <h1 className="crm-page-title">{t.pages.promotion}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.promotionLead}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{p.name}</h2>
              <Badge tone={p.active ? "ok" : "warn"}>{p.active ? t.pages.running : t.pages.endedPromo}</Badge>
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
