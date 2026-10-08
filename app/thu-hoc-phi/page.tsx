"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, inputClass } from "@/components/ui";
import { payReceivable } from "@/lib/actions";
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { usePageQuery } from "@/lib/page-query";
import { debtRemaining } from "@/lib/metrics";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { PayMethod } from "@/types";

type Receipt = { studentName: string; title: string; amount: number; method: PayMethod; day: string; note: string };

function printReceipt(receipt: Receipt, studio: string, labels: { title: string; cash: string; transfer: string }) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.write(`<!doctype html><title>${labels.title}</title><body style="font-family:sans-serif;padding:24px"><h1>${labels.title}</h1><p>${studio}</p><p>${receipt.day}</p><p><b>${receipt.studentName}</b></p><p>${receipt.title}</p><p style="font-size:28px"><b>${formatVnd(receipt.amount)}</b></p><p>${receipt.method === "cash" ? labels.cash : labels.transfer}</p><p>${receipt.note}</p></body>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function DebtsPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const rows = useLiveQuery(() => db.receivables.toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState("");
  const [receivableId, setReceivableId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [note, setNote] = useState("");
  const [billImage, setBillImage] = useState("");
  const [billName, setBillName] = useState("");
  const { branchId } = useStudioBranch();
  const { student: studentFromQuery } = usePageQuery();
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [methodFilter, setMethodFilter] = useState<"all" | PayMethod>("all");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!studentFromQuery || students.length === 0) return;
    const st = students.find((s) => s.id === studentFromQuery);
    if (!st) return;
    const first = rows.find((r) => r.studentId === st.id && debtRemaining(r) > 0);
    setStudentId(st.id);
    setQ(st.name);
    setReceivableId(first?.id ?? "");
    setAmount(first ? String(debtRemaining(first)) : "");
  }, [studentFromQuery, students, rows]);

  const matches = students.filter((s) => {
    if (branchId !== "all" && s.branchId !== branchId) return false;
    const stext = q.trim().toLowerCase();
    if (!stext) return Boolean(studentId) && s.id === studentId;
    return `${s.name} ${s.phone}`.toLowerCase().includes(stext);
  }).slice(0, 8);
  const student = students.find((s) => s.id === studentId);
  const debts = rows.filter((r) => r.studentId === studentId && (branchId === "all" || r.branchId === branchId));
  const openDebt = debts.reduce((sum, r) => sum + debtRemaining(r), 0);
  const pack = packages.find((p) => p.id === student?.packageId);
  const course = courses.find((c) => c.id === student?.courseId);
  const target = debts.find((r) => r.id === receivableId) ?? debts.find((r) => debtRemaining(r) > 0);
  const history = useMemo(() => payments.filter((p) => {
    if (studentId && p.studentId !== studentId) return false;
    if (branchId !== "all" && p.branchId !== branchId) return false;
    if (fromDay && p.day < fromDay) return false;
    if (toDay && p.day > toDay) return false;
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    return true;
  }).sort((a, b) => b.day.localeCompare(a.day)), [payments, studentId, branchId, fromDay, toDay, methodFilter]);

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="text-xl font-bold">{t.money.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  async function collect() {
    if (!target) {
      setError(t.pages.pickItem);
      return;
    }
    const result = await payReceivable({
      receivableId: target.id,
      amount: Number(amount) || 0,
      method,
      note,
      billNote: billName,
      billImage: method === "transfer" ? billImage : "",
    });
    if (typeof result === "string") {
      setError(result);
      return;
    }
    const slip: Receipt = { studentName: student?.name ?? result.studentName, title: target.title, amount: result.amount, method, day: result.day, note: note || target.title };
    setReceipt(slip);
    setError("");
    setAmount("");
    setNote("");
    setBillImage("");
    setBillName("");
  }

  return (
    <div>
      <h1 className="text-xl font-bold">{t.money.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.money.lead}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        <input className={`${inputClass} w-auto shrink-0`} type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} aria-label={t.pages.fromDay} />
        <input className={`${inputClass} w-auto shrink-0`} type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} aria-label={t.pages.toDay} />
        <select className={`${inputClass} w-auto shrink-0`} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as "all" | PayMethod)}>
          <option value="all">{t.money.method}</option>
          <option value="cash">{t.common.cash}</option>
          <option value="transfer">{t.common.transfer}</option>
        </select>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[12px] border border-slate-200 bg-white p-4">
          <input className={inputClass} placeholder={t.money.search} value={q} onChange={(e) => { const next = e.target.value; setQ(next); if (student && next.trim().toLowerCase() !== student.name.toLowerCase()) setStudentId(""); }} />
          {q.trim() && !student ? (
            <ul className="mt-2">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" className="flex min-h-12 w-full items-center justify-between rounded-[12px] px-2 text-left hover:bg-slate-50" onClick={() => { const first = rows.find((r) => r.studentId === s.id && debtRemaining(r) > 0); setStudentId(s.id); setQ(s.name); setReceivableId(first?.id ?? ""); setAmount(first ? String(debtRemaining(first)) : ""); }}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-sm tabular-nums">{formatVnd(s.debt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {student ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{student.name}</p>
                  <p className="text-sm text-slate-500">{pack?.name ?? t.pages.noPackage} · {course?.name ?? t.pages.noCourse} · {branches.find((b) => b.id === student.branchId)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold tabular-nums text-amber-800">{formatVnd(openDebt || student.debt)}</p>
                  <p className="text-xs text-slate-500">{t.money.debt}</p>
                </div>
              </div>
              <label className="mt-4 block text-sm">
                <span className="text-slate-500">{t.money.item}</span>
                <select className={`${inputClass} mt-1`} value={target?.id ?? ""} onChange={(e) => { setReceivableId(e.target.value); const row = debts.find((r) => r.id === e.target.value); setAmount(row ? String(debtRemaining(row)) : ""); }}>
                  {debts.filter((r) => debtRemaining(r) > 0).map((r) => <option key={r.id} value={r.id}>{r.title} · {t.pages.remain} {formatVnd(debtRemaining(r))}</option>)}
                </select>
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-sm">{t.pages.amount}
                  <input className={`${inputClass} mt-1`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
                </label>
                <label className="text-sm">{t.money.method}
                  <select className={`${inputClass} mt-1`} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                    <option value="cash">{t.common.cash}</option>
                    <option value="transfer">{t.common.transfer}</option>
                  </select>
                </label>
              </div>
              <label className="mt-2 block text-sm">{t.money.note}
                <input className={`${inputClass} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              {method === "transfer" ? (
                <label className="mt-2 block text-sm">{t.pages.bill}
                  <input className={`${inputClass} mt-1`} type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_500_000) { setError(t.pages.billTooBig); return; }
                    setBillName(file.name);
                    const reader = new FileReader();
                    reader.onload = () => setBillImage(String(reader.result || ""));
                    reader.readAsDataURL(file);
                  }} />
                </label>
              ) : null}
              {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
              <Button className="mt-3 min-h-12" onClick={() => void collect()}>{t.money.collect}</Button>
            </div>
          ) : q.trim() ? null : <p className="mt-4 text-sm text-slate-500">{t.money.typeName}</p>}
        </section>
        <aside className="rounded-[12px] border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{t.money.history}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.length === 0 ? <li className="text-slate-500">{t.money.empty}</li> : null}
            {history.slice(0, 12).map((p) => (
              <li key={p.id} className="border-t border-slate-100 py-2">
                <p className="font-semibold">{students.find((s) => s.id === p.studentId)?.name}</p>
                <p>{p.day} · {formatVnd(p.amount)} · {p.method === "cash" ? t.common.cash : t.common.transfer}</p>
                <p className="text-slate-500">{p.note}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      {receipt ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[12px] bg-white p-5">
            <h2 className="text-lg font-bold">{t.money.collected}</h2>
            <p className="mt-2 text-sm">{receipt.studentName}</p>
            <p className="text-sm text-slate-500">{receipt.title}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{formatVnd(receipt.amount)}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReceipt(null)}>{t.common.close}</Button>
              <Button className="flex-1" onClick={() => printReceipt(receipt, settings?.name || t.brand, { title: t.money.receipt, cash: t.common.cash, transfer: t.common.transfer })}>{t.money.print}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
