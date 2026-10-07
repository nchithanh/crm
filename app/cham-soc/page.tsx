"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { addLead, addLeadTouch, assignLeads, convertLead, moveLead, setLeadReminder } from "@/lib/actions";
import { db } from "@/lib/db";
import { LEAD_STAGES, leadStageLabel } from "@/lib/labels";
import { usePageQuery } from "@/lib/page-query";
import { dayFromOffset, localDayKey, zaloHref } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Lead, LeadStage } from "@/types";

const ZALO_SAMPLE = "Chào bạn, Edu Dance nhận được thông tin quan tâm lớp. Mình gọi lại để xếp lịch học thử nhé.";

function lastTouch(lead: Lead) {
  return [...lead.activities.map((a) => a.day), lead.day].sort().at(-1) ?? lead.day;
}

function isCold(lead: Lead) {
  if (lead.stage === "won" || lead.stage === "lost") return false;
  return lastTouch(lead) <= dayFromOffset(-3);
}

export default function LeadsPage() {
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const me = useAuthStore((s) => s.user);
  const { stage: stageQuery } = usePageQuery();
  const [mode, setMode] = useState<"kanban" | "table">("kanban");
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [ownerId, setOwnerId] = useState("all");
  const [status, setStatus] = useState<LeadStage | "all">("all");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [leadSource, setLeadSource] = useState("Quầy");

  useEffect(() => {
    if (stageQuery) setStatus(stageQuery as LeadStage);
  }, [stageQuery]);

  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (ownerId !== "all" && l.ownerId !== ownerId) return false;
      if (status !== "all" && l.stage !== status) return false;
      if (fromDay && l.day < fromDay) return false;
      if (toDay && l.day > toDay) return false;
      if (!s) return true;
      return `${l.name} ${l.phone} ${l.interest} ${l.source}`.toLowerCase().includes(s);
    });
  }, [leads, q, source, ownerId, status, fromDay, toDay]);
  const open = leads.find((l) => l.id === openId) ?? null;
  const chosen = filtered.filter((l) => picked.includes(l.id));

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function sendZalo() {
    for (const lead of chosen) {
      const href = zaloHref(lead.phone);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      void addLeadTouch(lead.id, "zalo", ZALO_SAMPLE);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Chăm sóc</h1>
          <p className="mt-1 text-sm text-slate-500">Mới → Đã liên hệ → Học thử → Chốt → Thất bại</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "kanban" ? "primary" : "outline"} onClick={() => setMode("kanban")}>Kanban</Button>
          <Button variant={mode === "table" ? "primary" : "outline"} onClick={() => setMode("table")}>Bảng</Button>
          <Button onClick={() => setForm(true)}>+ Thêm lead</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        <input className={`${inputClass} max-w-xs shrink-0`} placeholder="Tìm tên, số, khóa" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputClass} w-auto shrink-0`} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">Nguồn</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={`${inputClass} w-auto shrink-0`} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="all">Người phụ trách</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={`${inputClass} w-auto shrink-0`} value={status} onChange={(e) => setStatus(e.target.value as LeadStage | "all")}>
          <option value="all">Trạng thái</option>
          {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input className={`${inputClass} w-auto shrink-0`} type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} aria-label="Từ ngày" />
        <input className={`${inputClass} w-auto shrink-0`} type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} aria-label="Đến ngày" />
      </div>
      {chosen.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-semibold">{chosen.length} lead</span>
          <select className={`${inputClass} w-auto`} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Gán cho</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Button variant="outline" disabled={!assignTo} onClick={() => void assignLeads(chosen.map((l) => l.id), assignTo).then(() => setPicked([]))}>Gán hàng loạt</Button>
          <Button variant="outline" onClick={sendZalo}>Gửi Zalo mẫu</Button>
        </div>
      ) : null}

      {mode === "kanban" ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {LEAD_STAGES.map((col) => (
            <section key={col.id} className="w-72 shrink-0 rounded-[12px] bg-slate-100/80 p-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) void moveLead(id, col.id); }}>
              <h2 className="px-2 py-2 text-sm font-semibold">{col.label}<span className="ml-2 text-slate-400">{filtered.filter((l) => l.stage === col.id).length}</span></h2>
              <ul className="space-y-2">
                {filtered.filter((l) => l.stage === col.id).map((l) => {
                  const owner = users.find((u) => u.id === l.ownerId);
                  const cold = isCold(l);
                  return (
                    <li key={l.id}>
                      <article className={`rounded-[12px] bg-white p-3 shadow-sm ${cold ? "border border-amber-400" : "border border-transparent"}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1 h-5 w-5" checked={picked.includes(l.id)} aria-label={`Chọn ${l.name}`} onChange={() => toggle(l.id)} />
                          <button type="button" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)} onClick={() => setOpenId(l.id)} className="min-w-0 flex-1 text-left">
                            <p className="font-semibold">{l.name}</p>
                            <p className="text-xs text-slate-500">{l.source} · {l.interest}</p>
                            <p className="mt-1 text-xs text-slate-400">Liên hệ {lastTouch(l)} · {owner?.name ?? "—"}</p>
                            {cold ? <p className="mt-1 text-xs font-semibold text-amber-700">Lạnh hơn 3 ngày</p> : null}
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4 max-h-[70dvh] overflow-auto rounded-[12px] border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-3" />
                {["Tên", "Nguồn", "Khóa quan tâm", "Phụ trách", "Trạng thái", "Ngày", "Lần cuối"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-3"><input type="checkbox" className="h-5 w-5" checked={picked.includes(l.id)} aria-label={`Chọn ${l.name}`} onChange={() => toggle(l.id)} /></td>
                  <td className="px-3 py-3"><button type="button" className="font-semibold" onClick={() => setOpenId(l.id)}>{l.name}</button></td>
                  <td className="px-3 py-3">{l.source}</td>
                  <td className="px-3 py-3">{l.interest}</td>
                  <td className="px-3 py-3">{users.find((u) => u.id === l.ownerId)?.name}</td>
                  <td className="px-3 py-3"><Badge tone={isCold(l) ? "warn" : "info"}>{leadStageLabel(l.stage)}</Badge></td>
                  <td className="px-3 py-3">{l.day}</td>
                  <td className="px-3 py-3">{lastTouch(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? <LeadDrawer key={open.id} lead={open} users={users} branches={branches} onClose={() => setOpenId(null)} /> : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center">
          <form className="w-full max-w-md rounded-[12px] bg-white p-4" onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !phone.trim() || !me) return;
            void addLead({ name, phone, interest, source: leadSource, ownerId: me.id }).then(() => { setForm(false); setName(""); setPhone(""); setInterest(""); });
          }}>
            <h2 className="text-lg font-bold">Thêm lead</h2>
            <div className="mt-3 space-y-3">
              <Field label="Tên"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Điện thoại"><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Khóa quan tâm"><input className={inputClass} value={interest} onChange={(e) => setInterest(e.target.value)} /></Field>
              <Field label="Nguồn"><input className={inputClass} value={leadSource} onChange={(e) => setLeadSource(e.target.value)} /></Field>
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
  users,
  branches,
  onClose,
}: {
  lead: Lead;
  users: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [kind, setKind] = useState<"call" | "zalo" | "note">("call");
  const [text, setText] = useState("");
  const [nextAction, setNextAction] = useState(lead.nextAction ?? "");
  const [reminderDay, setReminderDay] = useState(lead.reminderDay ?? "");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [error, setError] = useState("");
  const owner = users.find((u) => u.id === lead.ownerId)?.name ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button className="absolute inset-0" aria-label="Đóng" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
        <p className="text-xs text-slate-400">Nguồn {lead.source}</p>
        <h2 className="mt-1 text-xl font-bold">{lead.name}</h2>
        <p className="text-sm text-slate-500">{lead.phone}</p>
        <p className="mt-2 text-sm">Khóa quan tâm: {lead.interest || "—"}</p>
        <p className="text-sm text-slate-500">Phụ trách: {owner}</p>
        {isCold(lead) ? <p className="mt-2 text-sm font-semibold text-amber-700">Không có hoạt động hơn 3 ngày</p> : null}
        <label className="mt-4 block text-sm">
          <span className="text-slate-500">Trạng thái</span>
          <select className={`${inputClass} mt-1`} value={lead.stage} onChange={(e) => void moveLead(lead.id, e.target.value as LeadStage)}>
            {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {lead.stage === "won" ? (
          <div className="mt-3 rounded-[12px] bg-orange-50 p-3">
            <p className="text-sm font-semibold">Chuyển thành học viên</p>
            {lead.convertedStudentId ? <p className="mt-1 text-sm text-slate-600">Đã tạo học viên.</p> : (
              <>
                <select className={`${inputClass} mt-2`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <Button className="mt-2 min-h-12 w-full" onClick={() => void convertLead(lead.id, branchId).then(setError)}>Chuyển thành học viên</Button>
              </>
            )}
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
          </div>
        ) : null}
        <h3 className="mt-5 text-sm font-semibold">Việc tiếp theo</h3>
        <input className={`${inputClass} mt-2`} placeholder="Gọi lại, nhắn Zalo..." value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        <input className={`${inputClass} mt-2`} type="date" value={reminderDay} onChange={(e) => setReminderDay(e.target.value)} aria-label="Ngày nhắc" />
        <Button className="mt-2" variant="outline" onClick={() => void setLeadReminder(lead.id, nextAction, reminderDay)}>Lưu nhắc</Button>
        <h3 className="mt-5 text-sm font-semibold">Thêm hoạt động</h3>
        <div className="mt-2 flex gap-2">
          {(["call", "zalo", "note"] as const).map((item) => (
            <button key={item} type="button" className={kind === item ? "min-h-11 rounded-full bg-slate-900 px-3 text-sm text-white" : "min-h-11 rounded-full border border-slate-200 px-3 text-sm"} onClick={() => setKind(item)}>
              {item === "call" ? "Gọi" : item === "zalo" ? "Zalo" : "Ghi chú"}
            </button>
          ))}
        </div>
        <textarea className={`${inputClass} mt-2 min-h-20`} value={text} onChange={(e) => setText(e.target.value)} />
        <Button className="mt-2" variant="outline" onClick={() => { void addLeadTouch(lead.id, kind, text); setText(""); }}>Ghi</Button>
        <h3 className="mt-5 text-sm font-semibold">Dòng thời gian</h3>
        <ol className="mt-2 space-y-3">
          {[...lead.activities].reverse().map((a, i) => (
            <li key={`${a.day}-${i}`} className="border-l-2 border-[#F97316] pl-3">
              <p className="text-xs text-slate-400">{a.day}{a.kind ? ` · ${a.kind === "call" ? "Gọi" : a.kind === "zalo" ? "Zalo" : "Ghi chú"}` : ""}</p>
              <p className="text-sm">{a.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-400">Hôm nay {localDayKey()}</p>
      </aside>
    </div>
  );
}
