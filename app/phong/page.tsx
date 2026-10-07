"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";

export default function RoomsPage() {
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold">Phòng</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rooms.map((r) => (
          <Card key={r.id} className="p-4">
            <h2 className="text-lg font-bold">{r.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{r.floor} · {r.capacity} người</p>
            <p className="mt-2 text-sm text-slate-600">{r.note}</p>
            <p className="mt-3 text-xs text-slate-400">{classes.filter((c) => c.roomId === r.id).length} lớp dùng phòng này</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
