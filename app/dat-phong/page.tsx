"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";

export default function RoomBookingsPage() {
  const { t } = useI18n();
  const bookings = useLiveQuery(() => db.bookings.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const label = { booked: t.pages.booked, done: t.pages.bookingDone, cancelled: t.status.cancelled } as const;
  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.booking}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.bookingLead}</p>
      <div className="mt-4 space-y-3">
        {[...bookings].sort((a, b) => (a.day < b.day ? 1 : -1)).map((b) => (
          <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{b.renter}</p>
              <p className="text-sm text-slate-500">{rooms.find((r) => r.id === b.roomId)?.name} · {b.day} · {b.start}–{b.end}</p>
              <p className="text-sm text-slate-600">{b.phone} · {formatVnd(b.fee)}</p>
            </div>
            <Badge tone={b.status === "booked" ? "info" : "ok"}>{label[b.status]}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
