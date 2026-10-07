"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { addLead, moveLead } from "@/lib/actions";
import { db } from "@/lib/db";
import { LEAD_STAGES, leadStageLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";
import type { Lead, LeadStage } from "@/types";

export default function LeadsPage() {
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const me = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<"kanban" | "table">("kanban");
  const [open, setOpen] = useState<Lead | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return leads;
    return leads.filter((l) => `${l.name} ${l.phone} ${l.interest}`.toLowerCase().includes(s));
  }, [leads, q]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
<h1 className="text-xl font-bold">Chăm sóc</h1>
      <p className="mt-1 text-sm text-slate-500">Mới → Đã liên hệ → Học thử → Chốt / Thất bại</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "kanban" ? "primary" : "outline"} onClick={() => setMode("kanban")}>
            Kanban
          </Button>
          <Button variant={mode === "table" ? "primary" : "outline"} onClick={() => setMode("table")}>
            Bảng
          </Button>
          <Button onClick={() => setForm(true)}>Thêm lead</Button>
        </div>
      </div>
      <input className={`${inputClass} mt-4 max-w-md`} placeholder="Tìm tên, số điện thoại, lớp quan tâm" value={q} onChange={(e) => setQ(e.target.value)} />

      {mode === "kanban" ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {LEAD_STAGES.map((stage) => (
            <section
              key={stage.id}
              className="w-64 shrink-0 rounded-[12px] bg-slate-100/80 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                if (id) void moveLead(id, stage.id);
              }}
            >
              <h2 className="px-2 py-2 text-sm font-semibold">
                {stage.label}
                <span className="ml-2 text-slate-400">{filtered.filter((l) => l.stage === stage.id).length}</span>
              </h2>
              <ul className="space-y-2">
                {filtered
                  .filter((l) => l.stage === stage.id)
                  .map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                        onClick={() => setOpen(l)}
                        className="w-full rounded-[12px] bg-white p-3 text-left shadow-sm"
                      >
                        <p className="font-semibold">{l.name}</p>
                        <p className="text-xs text-slate-500">{l.interest}</p>
                        <p className="mt-1 text-xs text-slate-400">{l.source}</p>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <Card className="mt-4 overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left">
              <tr>
                {["Tên", "Điện thoại", "Nguồn", "Quan tâm", "Giai đoạn", ""].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium">{l.name}</td>
                  <td className="px-3 py-3">{l.phone}</td>
                  <td className="px-3 py-3">{l.source}</td>
                  <td className="px-3 py-3">{l.interest}</td>
                  <td className="px-3 py-3"><Badge tone="info">{leadStageLabel(l.stage)}</Badge></td>
                  <td className="px-3 py-3">
                    <button className="font-semibold text-emerald-700" onClick={() => setOpen(l)}>Mở</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open ? (
        <LeadDrawer
          lead={leads.find((l) => l.id === open.id) ?? open}
          owner={users.find((u) => u.id === open.ownerId)?.name ?? ""}
          onClose={() => setOpen(null)}
          onMove={(stage) => void moveLead(open.id, stage)}
        />
      ) : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center">
          <form
            className="w-full max-w-md rounded-t-[12px] bg-white p-4 sm:rounded-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !phone.trim() || !me) return;
              void addLead({ name, phone, interest, source: "Quầy", ownerId: me.id }).then(() => {
                setForm(false);
                setName("");
                setPhone("");
                setInterest("");
              });
            }}
          >
            <h2 className="text-lg font-bold">Thêm lead</h2>
            <div className="mt-3 space-y-3">
              <Field label="Tên"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Điện thoại"><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Lớp quan tâm"><input className={inputClass} value={interest} onChange={(e) => setInterest(e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setForm(false)}>Hủy</Button>
              <Button className="flex-1" type="submit">Lưu</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function LeadDrawer({
  lead,
  owner,
  onClose,
  onMove,
}: {
  lead: Lead;
  owner: string;
  onClose: () => void;
  onMove: (stage: LeadStage) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button className="absolute inset-0" aria-label="Đóng" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
        <p className="text-xs text-slate-400">{lead.source} · {lead.day}</p>
        <h2 className="mt-1 text-xl font-bold">{lead.name}</h2>
        <p className="text-sm text-slate-500">{lead.phone}</p>
        <p className="mt-3 text-sm">Quan tâm: {lead.interest}</p>
        <p className="text-sm text-slate-500">Phụ trách: {owner || "—"}</p>
        {lead.note ? <p className="mt-2 text-sm">{lead.note}</p> : null}
        <label className="mt-4 block text-sm">
          <span className="text-slate-500">Giai đoạn</span>
          <select className={`${inputClass} mt-1`} value={lead.stage} onChange={(e) => onMove(e.target.value as LeadStage)}>
            {LEAD_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <h3 className="mt-6 text-sm font-semibold">Dòng thời gian</h3>
        <ol className="mt-2 space-y-3">
          {[...lead.activities].reverse().map((a, i) => (
            <li key={`${a.day}-${i}`} className="border-l-2 border-emerald-500 pl-3">
              <p className="text-xs text-slate-400">{a.day}</p>
              <p className="text-sm">{a.text}</p>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
