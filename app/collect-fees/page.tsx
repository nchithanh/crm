"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, Card, ctaGhost, inputClass, inputClassInline } from "@/components/ui";
import { TransferQr } from "@/components/finance/transfer-qr";
import { payReceivable } from "@/lib/actions";
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { usePageQuery } from "@/lib/page-query";
import { debtRemaining } from "@/lib/metrics";
import { cn, formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { PayMethod } from "@/types";

type CollectUiMethod = "cash" | "transfer" | "qr" | "debt";
type Receipt = { studentName: string; title: string; amount: number; method: PayMethod; day: string; note: string };

function printReceipt(receipt: Receipt, studio: string, labels: { title: string; cash: string; transfer: string }) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.write(`<!doctype html><title>${labels.title}</title><body style="font-family:sans-serif;padding:24px"><h1>${labels.title}</h1><p>${studio}</p><p>${receipt.day}</p><p><b>${receipt.studentName}</b></p><p>${receipt.title}</p><p style="font-size:28px"><b>${formatVnd(receipt.amount)}</b></p><p>${receipt.method === "cash" ? labels.cash : labels.transfer}</p><p>${receipt.note}</p></body>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function toPayMethod(m: CollectUiMethod): PayMethod {
  return m === "cash" ? "cash" : "transfer";
}

export default function FinanceCollectPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const rows = useLiveQuery(() => db.installments.toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState("");
  const [receivableId, setReceivableId] = useState("");
  const [amount, setAmount] = useState("");
  const [uiMethod, setUiMethod] = useState<CollectUiMethod>("cash");
  const [note, setNote] = useState("");
  const [billImage, setBillImage] = useState("");
  const [billName, setBillName] = useState("");
  const { branchId } = useStudioBranch();
  const { student: studentFromQuery } = usePageQuery();
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [methodFilter, setMethodFilter] = useState<"all" | PayMethod>("all");
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

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
  const pack = packages.find((p) => p.id === student?.subscriptionId);
  const course = courses.find((c) => c.id === student?.courseId);
  const target = debts.find((r) => r.id === receivableId) ?? debts.find((r) => debtRemaining(r) > 0);
  const payAmount = Number(amount) || 0;
  const history = useMemo(() => payments.filter((p) => {
    if (studentId && p.studentId !== studentId) return false;
    if (branchId !== "all" && p.branchId !== branchId) return false;
    if (fromDay && p.day < fromDay) return false;
    if (toDay && p.day > toDay) return false;
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    return true;
  }).sort((a, b) => b.day.localeCompare(a.day)), [payments, studentId, branchId, fromDay, toDay, methodFilter]);

  const methodLabel = (m: CollectUiMethod) => {
    if (m === "cash") return t.money.methodCash;
    if (m === "transfer") return t.money.methodCk;
    if (m === "qr") return t.money.methodQr;
    return t.money.methodDebt;
  };

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="crm-page-title">{t.money.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  function openCheckout() {
    if (!target) {
      setError(t.pages.pickItem);
      return;
    }
    if (uiMethod !== "debt" && payAmount <= 0) {
      setError(t.pages.pickItem);
      return;
    }
    setError("");
    setCheckoutOpen(true);
  }

  async function confirmPay() {
    if (!target) return;
    if (uiMethod === "debt") {
      setCheckoutOpen(false);
      setReceipt({
        studentName: student?.name ?? "",
        title: target.title,
        amount: 0,
        method: "cash",
        day: new Date().toISOString().slice(0, 10),
        note: t.money.debtNote,
      });
      return;
    }
    setBusy(true);
    const result = await payReceivable({
      receivableId: target.id,
      amount: payAmount,
      method: toPayMethod(uiMethod),
      note,
      billNote: billName,
      billImage: uiMethod === "transfer" || uiMethod === "qr" ? billImage : "",
    });
    setBusy(false);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setCheckoutOpen(false);
    setReceipt({
      studentName: student?.name ?? result.studentName,
      title: target.title,
      amount: result.amount,
      method: toPayMethod(uiMethod),
      day: result.day,
      note: note || target.title,
    });
    setAmount("");
    setNote("");
    setBillImage("");
    setBillName("");
    setError("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.money.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.money.lead}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/finance" className={ctaGhost}>{t.nav.financeOverview}</Link>
          <Link href="/receivables" className={ctaGhost}>{t.nav.debts}</Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className={inputClassInline} type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} aria-label={t.pages.fromDay} />
        <input className={inputClassInline} type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} aria-label={t.pages.toDay} />
        <select className={inputClassInline} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as "all" | PayMethod)}>
          <option value="all">{t.money.method}</option>
          <option value="cash">{t.common.cash}</option>
          <option value="transfer">{t.common.transfer}</option>
        </select>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-4">
          <input className={inputClass} placeholder={t.money.search} value={q} onChange={(e) => { const next = e.target.value; setQ(next); if (student && next.trim().toLowerCase() !== student.name.toLowerCase()) setStudentId(""); }} />
          {q.trim() && !student ? (
            <ul className="mt-2">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" className="flex min-h-12 w-full items-center justify-between rounded-[10px] px-2 text-left hover:bg-slate-50" onClick={() => { const first = rows.find((r) => r.studentId === s.id && debtRemaining(r) > 0); setStudentId(s.id); setQ(s.name); setReceivableId(first?.id ?? ""); setAmount(first ? String(debtRemaining(first)) : ""); }}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-sm tabular-nums">{formatVnd(s.debt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {student ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] border border-slate-100 bg-slate-50/80 px-3 py-2">
                <div>
                  <p className="text-lg font-bold">{student.name}</p>
                  <p className="text-sm text-slate-500">{pack?.name ?? t.pages.noPackage} · {course?.name ?? t.pages.noCourse} · {branches.find((b) => b.id === student.branchId)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-amber-800">{formatVnd(openDebt || student.debt)}</p>
                  <p className="text-xs text-slate-500">{t.money.debt}</p>
                </div>
              </div>

              <label className="block text-sm">
                <span className="text-slate-500">{t.money.item}</span>
                <select className={`${inputClass} mt-1`} value={target?.id ?? ""} onChange={(e) => { setReceivableId(e.target.value); const row = debts.find((r) => r.id === e.target.value); setAmount(row ? String(debtRemaining(row)) : ""); }}>
                  {debts.filter((r) => debtRemaining(r) > 0).map((r) => <option key={r.id} value={r.id}>{r.title} · {t.pages.remain} {formatVnd(debtRemaining(r))}</option>)}
                </select>
              </label>

              {target ? (
                <div className="rounded-[10px] border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{target.title}</p>
                      <p className="text-sm text-slate-500">{formatVnd(debtRemaining(target))}</p>
                    </div>
                    <p className="font-bold tabular-nums">{formatVnd(payAmount || debtRemaining(target))}</p>
                  </div>
                </div>
              ) : null}

              <label className="block text-sm">{t.pages.amount}
                <input className={`${inputClass} mt-1`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
              </label>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.money.subtotal}</span>
                <span className="tabular-nums">{formatVnd(payAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>{t.money.total}</span>
                <span className="tabular-nums">{formatVnd(payAmount)}</span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {([
                  ["cash", t.money.methodCash],
                  ["transfer", t.money.methodCk],
                  ["qr", t.money.methodQr],
                  ["debt", t.money.methodDebt],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUiMethod(id)}
                    className={cn(
                      "rounded-[8px] border px-1 py-2.5 text-[11px] font-semibold",
                      uiMethod === id
                        ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                        : "border-slate-200 text-slate-700",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(uiMethod === "transfer" || uiMethod === "qr") && payAmount > 0 ? (
                <TransferQr
                  amount={payAmount}
                  studentName={student.name}
                  studentPhone={student.phone}
                  studio={settings?.name}
                />
              ) : null}

              {uiMethod === "debt" ? (
                <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-sm text-amber-800">{t.money.debtNote}</p>
              ) : null}

              <label className="block text-sm">{t.money.note}
                <input className={`${inputClass} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              {(uiMethod === "transfer" || uiMethod === "qr") ? (
                <label className="block text-sm">{t.pages.bill}
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

              {error ? <p className="text-sm text-rose-700">{error}</p> : null}

              <Button className="min-h-12 w-full" onClick={openCheckout} disabled={!target}>
                {uiMethod === "debt" ? t.money.keepDebt : `${t.money.payCta} · ${formatVnd(payAmount)}`}
              </Button>
            </div>
          ) : q.trim() ? null : <p className="mt-4 text-sm text-slate-500">{t.money.typeName}</p>}
        </Card>
        <Card className="p-4">
          <h2 className="crm-section-title">{t.money.history}</h2>
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
        </Card>
      </div>

      {checkoutOpen && target ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[10px] bg-white p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{t.money.confirmPay}</h2>
              <button type="button" className="rounded-[10px] p-1 text-slate-500 hover:bg-slate-100" aria-label={t.common.close} onClick={() => setCheckoutOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatVnd(uiMethod === "debt" ? debtRemaining(target) : payAmount)}</p>
            <p className="mt-1 text-sm text-slate-500">{t.money.methodLabel}: {methodLabel(uiMethod)}</p>
            <p className="mt-1 text-sm text-slate-500">{student?.name} · {target.title}</p>

            {uiMethod === "debt" ? (
              <p className="mt-3 rounded-[10px] bg-amber-50 p-3 text-sm text-amber-800">{t.money.debtNote}</p>
            ) : null}

            {(uiMethod === "transfer" || uiMethod === "qr") ? (
              <TransferQr
                amount={payAmount}
                studentName={student?.name}
                studentPhone={student?.phone}
                studio={settings?.name}
              />
            ) : null}

            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCheckoutOpen(false)}>{t.common.cancel}</Button>
              <Button className="flex-1" disabled={busy} onClick={() => void confirmPay()}>
                {uiMethod === "debt" ? t.money.keepDebt : t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {receipt ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[10px] bg-white p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{t.money.successTitle}</h2>
              <button type="button" className="rounded-[10px] p-1 text-slate-500 hover:bg-slate-100" aria-label={t.common.close} onClick={() => setReceipt(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</span>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide">{t.money.collected}</p>
              <p className="mt-1 text-sm text-slate-500">{receipt.studentName}</p>
              <p className="text-sm text-slate-500">{receipt.title}</p>
              {receipt.amount > 0 ? (
                <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">{formatVnd(receipt.amount)}</p>
              ) : (
                <p className="mt-2 text-sm text-amber-800">{t.money.debtNote}</p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {receipt.amount > 0 ? (
                <Button variant="outline" onClick={() => printReceipt(receipt, settings?.name || t.brand, { title: t.money.receipt, cash: t.common.cash, transfer: t.common.transfer })}>
                  {t.money.print}
                </Button>
              ) : null}
              <Button onClick={() => setReceipt(null)}>{t.money.done}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
