"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { createRoom, updateRoom } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import type { Room } from "@/types";

export default function RoomsPage() {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="crm-page-title">{t.pages.rooms}</h1>
        {canEdit ? (
          <Button type="button" onClick={() => setCreating((v) => !v)}>{t.catalog.addRoom}</Button>
        ) : (
          <p className="text-sm text-slate-500">{t.catalog.viewOnly}</p>
        )}
      </div>
      {creating && canEdit ? <RoomForm branches={branches} onDone={() => setCreating(false)} /> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rooms.map((r) => (
          <Card key={r.id} className="p-4">
            <h2 className="text-lg font-bold">{r.name}</h2>
            <p className="text-sm text-slate-500">{branches.find((b) => b.id === r.branchId)?.name}</p>
            <p className="mt-1 text-sm text-slate-500">{r.floor} · {fill(t.pages.people, { n: r.capacity })}</p>
            <p className="mt-2 text-sm text-slate-600">{r.note}</p>
            <p className="mt-3 text-xs text-slate-400">{fill(t.pages.roomUse, { n: classes.filter((c) => c.roomId === r.id).length })}</p>
            {canEdit ? (
              <Button type="button" variant="outline" className="mt-3" onClick={() => setEditId(editId === r.id ? null : r.id)}>
                {t.catalog.edit}
              </Button>
            ) : null}
            {canEdit && editId === r.id ? <RoomForm room={r} branches={branches} onDone={() => setEditId(null)} /> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function RoomForm({
  room,
  branches,
  onDone,
}: {
  room?: Room;
  branches: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(room?.name ?? "");
  const [branchId, setBranchId] = useState(room?.branchId ?? branches[0]?.id ?? "");
  const [floor, setFloor] = useState(room?.floor ?? "");
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 12));
  const [note, setNote] = useState(room?.note ?? "");
  const [error, setError] = useState("");

  async function save() {
    const code = room
      ? await updateRoom({ id: room.id, name, floor, capacity: Number(capacity) || 0, note })
      : await createRoom({ name, branchId, floor, capacity: Number(capacity) || 0, note });
    setError(code ? t.catalog.needFields : "");
    if (!code) onDone();
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field label={t.common.room}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      {room ? null : (
        <Field label={t.common.branch}>
          <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t.catalog.floor}><input className={inputClass} value={floor} onChange={(e) => setFloor(e.target.value)} /></Field>
      <Field label={t.catalog.capacity}><input className={inputClass} type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
      <Field label={t.money.note}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
        <Button type="button" onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  );
}
