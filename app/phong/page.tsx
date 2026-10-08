"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export default function RoomsPage() {
  const { t } = useI18n();
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.rooms}</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rooms.map((r) => (
          <Card key={r.id} className="p-4">
            <h2 className="text-lg font-bold">{r.name}</h2>
            <p className="text-sm text-slate-500">{branches.find((b) => b.id === r.branchId)?.name}</p>
            <p className="mt-1 text-sm text-slate-500">{r.floor} · {fill(t.pages.people, { n: r.capacity })}</p>
            <p className="mt-2 text-sm text-slate-600">{r.note}</p>
            <p className="mt-3 text-xs text-slate-400">{fill(t.pages.roomUse, { n: classes.filter((c) => c.roomId === r.id).length })}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
