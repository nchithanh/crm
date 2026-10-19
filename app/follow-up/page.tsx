"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Field, inputClass, inputClassInline } from "@/components/ui";
import { addLead, addLeadTouch, assignLeads, convertLead, moveLead, savePromotion, setLeadReminder } from "@/lib/actions";
import { canManagePromotions, canSeeContact } from "@/lib/access";
import { db } from "@/lib/db";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { leadStageLabel, leadStages, leadStageTone } from "@/lib/labels";
import { usePageQuery } from "@/lib/page-query";
import { SharePreviewDialog, type SharePreviewInput } from "@/components/share-preview";
import { CrmModalShell, CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { dayFromOffset, localDayKey, zaloHref } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Lead, LeadStage, Student } from "@/types";

function zaloSample(studio: string, template: string) {
  return fill(template, { studio });
}

function lastTouch(lead: Lead) {
  return [...lead.activities.map((a) => a.day), lead.day].sort().at(-1) ?? lead.day;
}

function isCold(lead: Lead) {
  if (lead.stage === "won" || lead.stage === "lost") return false;
  return lastTouch(lead) <= dayFromOffset(-3);
}

export default function LeadsPage() {
  const { lang, t } = useI18n();
  const stages = leadStages(lang);
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const socialPosts = useLiveQuery(() => db.socialPosts.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const me = useAuthStore((s) => s.user);
  const { stage: stageQuery } = usePageQuery();
  const [mode, setMode] = useState<"kanban" | "table">("kanban");
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [postId, setPostId] = useState("all");
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
      if (postId !== "all" && l.postId !== postId) return false;
      if (ownerId !== "all" && l.ownerId !== ownerId) return false;
      if (status !== "all" && l.stage !== status) return false;
      if (fromDay && l.day < fromDay) return false;
      if (toDay && l.day > toDay) return false;
      if (!s) return true;
      return `${l.name} ${l.phone} ${l.interest} ${l.source}`.toLowerCase().includes(s);
    });
  }, [leads, q, source, postId, ownerId, status, fromDay, toDay]);
  const open = leads.find((l) => l.id === openId) ?? null;
  const chosen = filtered.filter((l) => picked.includes(l.id));

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function sendZalo() {
    for (const lead of chosen) {
      const href = zaloHref(lead.phone);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      void addLeadTouch(lead.id, "zalo", zaloSample(settings?.name || t.brand, t.care.zaloText));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.care.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.care.flow}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "kanban" ? "primary" : "outline"} onClick={() => setMode("kanban")}>{t.care.kanban}</Button>
          <Button variant={mode === "table" ? "primary" : "outline"} onClick={() => setMode("table")}>{t.care.table}</Button>
          <Button onClick={() => setForm(true)}>{t.care.add}</Button>
        </div>
      </div>
      <BirthdayReminders />
      <div className="mt-4 flex gap-2 overflow-x-auto">
        <input className={`${inputClass} !w-auto min-w-0 flex-1 !max-w-none`} placeholder={t.care.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClassInline} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">{t.care.source}</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inputClassInline} value={postId} onChange={(e) => setPostId(e.target.value)} aria-label={t.campaigns.filterPost}>
          <option value="all">{t.campaigns.allPosts}</option>
          {socialPosts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select className={inputClassInline} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="all">{t.care.owner}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={inputClassInline} value={status} onChange={(e) => setStatus(e.target.value as LeadStage | "all")}>
          <option value="all">{t.care.statusAll}</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input className={inputClassInline} type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} aria-label={t.care.fromDay} />
        <input className={inputClassInline} type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} aria-label={t.care.toDay} />
      </div>
      {chosen.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-semibold">{fill(t.care.selected, { n: chosen.length })}</span>
          <select className={`${inputClass} w-auto`} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">{t.care.assignTo}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Button variant="outline" disabled={!assignTo} onClick={() => void assignLeads(chosen.map((l) => l.id), assignTo).then(() => setPicked([]))}>{t.care.assign}</Button>
          <Button variant="outline" onClick={sendZalo}>{t.care.zalo}</Button>
        </div>
      ) : null}

      {mode === "kanban" ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {stages.map((col) => (
            <section key={col.id} className="w-72 shrink-0 rounded-xl bg-slate-100/80 p-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) void moveLead(id, col.id); }}>
              <h2 className="px-2 py-2 text-sm font-semibold">{col.label}<span className="ml-2 text-slate-400">{filtered.filter((l) => l.stage === col.id).length}</span></h2>
              <ul className="space-y-2">
                {filtered.filter((l) => l.stage === col.id).map((l) => {
                  const owner = users.find((u) => u.id === l.ownerId);
                  const cold = isCold(l);
                  return (
                    <li key={l.id}>
                      <article className={`rounded-xl bg-[var(--card)] p-3 ${cold ? "border border-amber-400" : "border border-transparent"}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1 h-5 w-5" checked={picked.includes(l.id)} aria-label={`Chọn ${l.name}`} onChange={() => toggle(l.id)} />
                          <button type="button" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)} onClick={() => setOpenId(l.id)} className="min-w-0 flex-1 text-left">
                            <p className="font-semibold">{l.name}</p>
                            <p className="text-xs text-slate-500">{l.source} · {l.interest}</p>
                            {l.channel ? (
                              <p className="mt-1 text-xs font-medium text-[var(--brand-600)]">
                                {fill(t.campaigns.chipFrom, { channel: l.channel })}
                                {l.linkSlug ? ` · /r/${l.linkSlug}` : ""}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-slate-400">Liên hệ {lastTouch(l)} · {owner?.name ?? "—"}</p>
                            {cold ? <p className="mt-1 text-xs font-semibold text-amber-700">{t.care.cold}</p> : null}
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
        <div className="mt-4 max-h-[70dvh] overflow-auto rounded-xl border border-slate-200 bg-white">
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
                  <td className="px-3 py-3"><Badge tone={isCold(l) ? "warn" : leadStageTone(l.stage)}>{leadStageLabel(l.stage, lang)}</Badge></td>
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
          <form className="w-full max-w-md rounded-xl bg-white p-4" onSubmit={(e) => {
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

function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return localDayKey(new Date(y, (m ?? 1) - 1, (d ?? 1) + n, 12));
}

function isRealDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d, 12);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function nextBirthday(birthDay: string, today: string) {
  const parts = birthDay.split("-");
  const month = parts[1];
  const date = parts[2];
  if (!month || !date) return null;
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${month}-${date}`;
  if (isRealDay(thisYear) && thisYear >= today) return thisYear;
  const nextYear = `${year + 1}-${month}-${date}`;
  return isRealDay(nextYear) ? nextYear : null;
}

function birthdayCode(name: string, day: string) {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
  const last = plain.trim().split(/\s+/).at(-1) ?? "HV";
  const token = last.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "HV";
  return `SN${token}${day.slice(5, 10).replace("-", "")}`;
}

function BirthdayReminders() {
  const { t } = useI18n();
  const me = useAuthStore((s) => s.user);
  const { branchId } = useStudioBranch();
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const [draft, setDraft] = useState<{
    studentId: string;
    name: string;
    code: string;
    percent: string;
    startDay: string;
    endDay: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{
    studentId: string;
    promoName: string;
    code: string;
    percent: string;
    startDay: string;
    endDay: string;
    studentName: string;
    phone: string;
  } | null>(null);
  const [shown, setShown] = useState<Record<string, { promoName: string; code: string; percent: string; startDay: string; endDay: string }>>({});
  const [care, setCare] = useState<Record<string, { zalo: boolean; code: boolean }>>({});
  const [shareNote, setShareNote] = useState("");
  const [shareDraft, setShareDraft] = useState<SharePreviewInput | null>(null);
  const [pendingCare, setPendingCare] = useState<{ studentId: string; kind: "zalo" | "code" } | null>(null);
  const [busy, setBusy] = useState(false);
  const seeContact = canSeeContact(me?.role);
  const canSave = canManagePromotions(me?.role);
  const today = localDayKey();
  const due = useMemo(() => {
    return students
      .filter((student) => branchId === "all" || student.branchId === branchId)
      .map((student) => {
        const day = nextBirthday(student.birthDay, today);
        if (!day) return null;
        const left = Math.round((new Date(`${day}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
        if (left < 0 || left > 7) return null;
        return { student, day, left };
      })
      .filter((row): row is { student: Student; day: string; left: number } => row !== null)
      .sort((a, b) => a.left - b.left || a.student.name.localeCompare(b.student.name));
  }, [students, branchId, today]);

  function openPreview(student: Student, day: string) {
    setError("");
    setCreated(null);
    setShareNote("");
    setCopied(false);
    setDraft({
      studentId: student.id,
      name: fill(t.care.promoName, { name: student.name }),
      code: birthdayCode(student.name, day),
      percent: "10",
      startDay: day,
      endDay: addDays(day, 6),
    });
  }

  async function copyDraft() {
    if (!draft?.code.trim()) return;
    await navigator.clipboard.writeText(draft.code.trim().toUpperCase());
    setCopied(true);
  }

  async function saveDraft() {
    if (!draft || !canSave) return;
    setBusy(true);
    setError("");
    const code = await savePromotion({
      role: me?.role,
      name: draft.name,
      startDay: draft.startDay,
      endDay: draft.endDay,
      weekdays: [],
      branchIds: [],
      courseIds: [],
      minTuition: null,
      benefit: "percent",
      benefitValue: Number(draft.percent),
      codeMode: "or",
      codes: [{ code: draft.code, maxUses: null }],
      oncePerStudent: true,
      active: true,
      note: "",
    });
    setBusy(false);
    const message: Record<string, string> = {
      owner: t.promo.ownerOnly,
      name: t.promo.needName,
      date: t.promo.needDate,
      value: t.promo.needValue,
      percent: t.promo.needPercent,
      codes: t.promo.needCodes,
    };
    if (code) {
      setError(message[code] || code);
      return;
    }
    const student = students.find((row) => row.id === draft.studentId);
    const saved = {
      studentId: draft.studentId,
      promoName: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      percent: String(Math.round(Number(draft.percent))),
      startDay: draft.startDay,
      endDay: draft.endDay,
      studentName: student?.name ?? draft.name.trim(),
      phone: student?.phone ?? "",
    };
    setCreated(saved);
    setShown((cur) => ({
      ...cur,
      [saved.studentId]: {
        promoName: saved.promoName,
        code: saved.code,
        percent: saved.percent,
        startDay: saved.startDay,
        endDay: saved.endDay,
      },
    }));
    setDraft(null);
    setShareNote("");
  }

  function openShareCreated() {
    if (!created) return;
    setPendingCare({ studentId: created.studentId, kind: "code" });
    setShareDraft({
      title: created.promoName,
      text: fill(t.care.shareText, {
        name: created.studentName,
        code: created.code,
        percent: created.percent,
        from: created.startDay,
        to: created.endDay,
      }),
      phone: created.phone,
    });
  }

  function markCare(studentId: string, kind: "zalo" | "code") {
    setCare((cur) => ({
      ...cur,
      [studentId]: { zalo: cur[studentId]?.zalo ?? false, code: cur[studentId]?.code ?? false, [kind]: true },
    }));
  }

  function sendZaloWish(student: Student) {
    setPendingCare({ studentId: student.id, kind: "zalo" });
    setShareDraft({
      title: t.care.shareZalo,
      text: fill(t.care.zaloWish, { name: student.name }),
      phone: student.phone,
    });
  }

  function shareCardCode(student: Student) {
    const row = shown[student.id];
    if (!row) return;
    setPendingCare({ studentId: student.id, kind: "code" });
    setShareDraft({
      title: row.promoName,
      text: fill(t.care.shareText, {
        name: student.name,
        code: row.code,
        percent: row.percent,
        from: row.startDay,
        to: row.endDay,
      }),
      phone: student.phone,
    });
  }

  function onShareDone(result: "shared" | "copied") {
    setShareNote(result === "copied" ? t.care.shareCopied : t.care.shareOpened);
    if (pendingCare) markCare(pendingCare.studentId, pendingCare.kind);
    setPendingCare(null);
  }

  return (
    <section className="mt-4" aria-labelledby="care-remind-heading">
      <h2 id="care-remind-heading" className="text-base font-bold">{t.care.remindTitle}</h2>
      {([
        ["today", t.care.todayTitle, t.care.todayEmpty, due.filter((row) => row.left === 0)],
        ["soon", t.care.upcomingTitle, t.care.upcomingEmpty, due.filter((row) => row.left > 0)],
      ] as const).map(([id, title, empty, rows]) => (
        <div key={id} className="mt-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          {rows.length === 0 ? <p className="mt-1 text-sm text-slate-500">{empty}</p> : (
            <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
              {rows.map(({ student, day, left }) => {
                const phone = student.phone?.trim() ?? "";
                const zalo = zaloHref(phone);
                return (
                  <li key={student.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-slate-500">
                      <time dateTime={day}>{left === 0 ? t.care.birthdayToday : fill(t.care.birthdayIn, { day, n: left })}</time>
                    </p>
                    {shown[student.id] ? (
                      <p className="mt-1 text-sm font-semibold text-[var(--brand-700)]">{shown[student.id].promoName} · {shown[student.id].code}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-semibold">
                      {care[student.id]?.zalo || care[student.id]?.code ? (
                        <span className="text-green-800">
                          {[care[student.id]?.zalo ? t.care.statusZalo : "", care[student.id]?.code ? t.care.statusCode : ""].filter(Boolean).join(" · ")}
                        </span>
                      ) : (
                        <span className="text-slate-500">{t.care.statusNone}</span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" className="min-h-10" onClick={() => openPreview(student, day)}>{t.care.quickCode}</Button>
                      {shown[student.id] ? (
                        <Button type="button" variant="outline" className="min-h-10" onClick={() => shareCardCode(student)}>{t.care.shareCode}</Button>
                      ) : null}
                      {seeContact && phone ? (
                        <a className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold" href={`tel:${phone}`}>{t.care.call}</a>
                      ) : null}
                      {seeContact && zalo ? (
                        <button type="button" className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold" onClick={() => sendZaloWish(student)}>Zalo</button>
                      ) : null}
                      <Link className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold" href={`/students/${student.id}`}>{t.care.openStudent}</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
      {created ? (
        <CreatedPromoModal
          created={created}
          shareNote={shareNote}
          onClose={() => setCreated(null)}
          onShare={openShareCreated}
        />
      ) : null}
      {draft ? (
        <DraftPromoModal
          draft={draft}
          error={error}
          busy={busy}
          copied={copied}
          canSave={canSave}
          onClose={() => setDraft(null)}
          onCopy={() => void copyDraft()}
          onChange={setDraft}
          onSave={() => void saveDraft()}
        />
      ) : null}
      <SharePreviewDialog
        open={Boolean(shareDraft)}
        draft={shareDraft}
        onClose={() => {
          setShareDraft(null);
          setPendingCare(null);
        }}
        onDone={onShareDone}
      />
    </section>
  );
}

function CreatedPromoModal({
  created,
  shareNote,
  onClose,
  onShare,
}: {
  created: {
    promoName: string;
    code: string;
    percent: string;
    startDay: string;
    endDay: string;
  };
  shareNote: string;
  onClose: () => void;
  onShare: () => void;
}) {
  const { t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  return (
    <CrmModalShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close}>
      <h3 className="text-lg font-bold">{t.care.saved}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500">{t.promo.name}</dt>
        <dd className="text-right font-semibold">{created.promoName}</dd>
        <dt className="text-slate-500">{t.care.code}</dt>
        <dd className="text-right font-semibold tabular-nums">{created.code}</dd>
        <dt className="text-slate-500">{t.care.discount}</dt>
        <dd className="text-right tabular-nums">{created.percent}%</dd>
        <dt className="text-slate-500">{t.care.fromDay}</dt>
        <dd className="text-right"><time dateTime={created.startDay}>{created.startDay}</time></dd>
        <dt className="text-slate-500">{t.care.toDay}</dt>
        <dd className="text-right"><time dateTime={created.endDay}>{created.endDay}</time></dd>
      </dl>
      {shareNote ? <p className="mt-3 text-sm text-green-800">{shareNote}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={requestClose}>{t.common.close}</Button>
        <Button type="button" onClick={onShare}>{t.care.shareZalo}</Button>
      </div>
    </CrmModalShell>
  );
}

function DraftPromoModal({
  draft,
  error,
  busy,
  copied,
  canSave,
  onClose,
  onCopy,
  onChange,
  onSave,
}: {
  draft: {
    studentId: string;
    name: string;
    code: string;
    percent: string;
    startDay: string;
    endDay: string;
  };
  error: string;
  busy: boolean;
  copied: boolean;
  canSave: boolean;
  onClose: () => void;
  onCopy: () => void;
  onChange: (next: typeof draft) => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  return (
    <CrmModalShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-h-[90vh] overflow-y-auto">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <h3 className="text-lg font-bold">{t.care.previewTitle}</h3>
        <div className="mt-3 space-y-3">
          <Field label={t.promo.name}>
            <input className={inputClass} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          </Field>
          <Field label={t.care.code}>
            <input className={inputClass} value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value })} />
          </Field>
          <Field label={t.care.discount}>
            <input className={inputClass} inputMode="numeric" value={draft.percent} onChange={(event) => onChange({ ...draft, percent: event.target.value })} />
          </Field>
          <Field label={t.care.fromDay}>
            <input className={inputClass} type="date" value={draft.startDay} onChange={(event) => onChange({ ...draft, startDay: event.target.value })} />
          </Field>
          <Field label={t.care.toDay}>
            <input className={inputClass} type="date" value={draft.endDay} onChange={(event) => onChange({ ...draft, endDay: event.target.value })} />
          </Field>
        </div>
        {!canSave ? <p className="mt-3 text-sm text-slate-500">{t.care.receptionHint}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={requestClose}>{t.common.cancel}</Button>
          <Button type="button" variant="outline" onClick={onCopy}>{copied ? t.care.copied : t.care.copyCode}</Button>
          {canSave ? <Button type="submit" disabled={busy}>{t.care.saveCode}</Button> : null}
        </div>
      </form>
    </CrmModalShell>
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
  const { lang, t } = useI18n();
  const stages = leadStages(lang);
  const [kind, setKind] = useState<"call" | "zalo" | "note">("call");
  const [text, setText] = useState("");
  const [nextAction, setNextAction] = useState(lead.nextAction ?? "");
  const [reminderDay, setReminderDay] = useState(lead.reminderDay ?? "");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [error, setError] = useState("");
  const owner = users.find((u) => u.id === lead.ownerId)?.name ?? "—";
  const { leaving, requestClose } = useOverlayClose(onClose);

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-w-md overflow-y-auto bg-white p-5">
        <p className="text-xs text-slate-400">{t.care.source} {lead.source}</p>
        <h2 className="mt-1 crm-page-title">{lead.name}</h2>
        <p className="text-sm text-slate-500">{lead.phone}</p>
        <p className="mt-2 text-sm">{t.care.interest}: {lead.interest || "—"}</p>
        <p className="text-sm text-slate-500">{t.care.owner}: {owner}</p>
        {isCold(lead) ? <p className="mt-2 text-sm font-semibold text-amber-700">{t.care.coldLong}</p> : null}
        <label className="mt-4 block text-sm">
          <span className="text-slate-500">{t.common.status}</span>
          <select className={`${inputClass} mt-1`} value={lead.stage} onChange={(e) => void moveLead(lead.id, e.target.value as LeadStage)}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {lead.stage === "won" ? (
          <div className="mt-3 rounded-xl bg-[var(--brand-50)] p-3">
            <p className="text-sm font-semibold">{t.care.convert}</p>
            {lead.convertedStudentId ? <p className="mt-1 text-sm text-slate-600">{t.care.converted}</p> : (
              <>
                <select className={`${inputClass} mt-2`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <Button className="mt-2 min-h-12 w-full" onClick={() => void convertLead(lead.id, branchId).then(setError)}>{t.care.convert}</Button>
              </>
            )}
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
          </div>
        ) : null}
        <h3 className="mt-5 text-sm font-semibold">{t.care.next}</h3>
        <input className={`${inputClass} mt-2`} placeholder={t.care.nextPlaceholder} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        <input className={`${inputClass} mt-2`} type="date" value={reminderDay} onChange={(e) => setReminderDay(e.target.value)} aria-label={t.care.reminderDay} />
        <Button className="mt-2" variant="outline" onClick={() => void setLeadReminder(lead.id, nextAction, reminderDay)}>{t.care.saveReminder}</Button>
        <h3 className="mt-5 text-sm font-semibold">{t.care.addTouch}</h3>
        <div className="mt-2 flex gap-2">
          {(["call", "zalo", "note"] as const).map((item) => (
            <button key={item} type="button" className={kind === item ? "h-10 rounded-xl bg-[var(--brand-500)] px-3 text-sm font-semibold text-white" : "h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm"} onClick={() => setKind(item)}>
              {item === "call" ? t.care.call : item === "zalo" ? "Zalo" : t.care.note}
            </button>
          ))}
        </div>
        <textarea className={`${inputClass} mt-2 min-h-20`} value={text} onChange={(e) => setText(e.target.value)} />
        <Button className="mt-2" variant="outline" onClick={() => { void addLeadTouch(lead.id, kind, text); setText(""); }}>{t.care.write}</Button>
        <h3 className="mt-5 text-sm font-semibold">{t.care.timeline}</h3>
        <ol className="mt-2 space-y-3">
          {[...lead.activities].reverse().map((a, i) => (
            <li key={`${a.day}-${i}`} className="border-l-2 border-[var(--brand-500)] pl-3">
              <p className="text-xs text-slate-400">{a.day}{a.kind ? ` · ${a.kind === "call" ? t.care.call : a.kind === "zalo" ? "Zalo" : t.care.note}` : ""}</p>
              <p className="text-sm">{a.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-400">{t.common.today} {localDayKey()}</p>
    </CrmDrawerShell>
  );
}
