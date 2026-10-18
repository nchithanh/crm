"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PromotionPicker } from "@/components/promotion-picker";
import { TransferQr } from "@/components/finance/transfer-qr";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { addPackage, enrollStudent, payReceivable } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { pickPaymentAccount, transferMemo } from "@/lib/payment-accounts";
import { quotePromotion, splitCodes } from "@/lib/promotions";
import { isSubscriptionValid, needsRenew } from "@/lib/subscription";
import { cn, formatVnd, localDayKey } from "@/lib/utils";
import type { PayMethod } from "@/types";

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const plans = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const promotions = useLiveQuery(() => db.promotions.toArray(), []) ?? [];
  const paymentAccounts = useLiveQuery(() => db.paymentAccounts.toArray(), []) ?? [];
  const paymentRoutes = useLiveQuery(() => db.paymentRoutes.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const [studentId, setStudentId] = useState("");
  const [planId, setPlanId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [promoCodes, setPromoCodes] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer" | "debt">("cash");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const today = localDayKey();
  const buyer = students.find((row) => row.id === studentId);
  const sku = plans.find((row) => row.id === planId && row.kind === "course");
  const course = courses.find((row) => row.id === courseId);
  const usedPromoIds = subscriptions.filter((row) => row.studentId === studentId && row.promotionId).map((row) => row.promotionId as string);
  const selectedPromo = promotions.find((row) => row.id === promotionId);
  const promoQuote = sku && course && selectedPromo
    ? quotePromotion({
        promotion: selectedPromo,
        tuition: sku.price,
        course,
        codes: splitCodes(promoCodes),
        alreadyUsed: usedPromoIds.includes(promotionId),
      })
    : null;
  const payable = promoQuote?.quote?.payable ?? sku?.price ?? 0;
  const payAccount = useMemo(
    () => pickPaymentAccount(payable, paymentAccounts, paymentRoutes),
    [payable, paymentAccounts, paymentRoutes],
  );

  const rows = useMemo(
    () => [...subscriptions].sort((a, b) => (a.day < b.day ? 1 : -1)),
    [subscriptions],
  );

  return (
    <div>
      <h1 className="crm-page-title">{t.nav.packages}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.addSessionsLead}</p>

      <section className="mt-6">
        <h2 className="text-base font-bold">{t.pages.subPlans}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-4">
              <p className="text-sm text-slate-500">{p.sessions} {t.pages.sessions} · {p.months} {t.pages.monthUnit}</p>
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-600)]">{formatVnd(p.price)}</p>
              <p className="mt-1 text-xs text-slate-400">{p.note}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4 p-4">
          <h3 className="font-semibold">{t.pages.createPackage}</h3>
          <CreatePlanForm />
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-bold">{t.pages.addSessions}</h2>
        <Card className="mt-3 p-4">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!studentId || !planId || !courseId || !sku) return;
              if (promotionId && promoQuote && !promoQuote.quote) {
                setDone("");
                setError(promoQuote.error);
                return;
              }
              setBusy(true);
              setError("");
              setDone("");
              void (async () => {
                const created = await enrollStudent({
                  studentId,
                  planId,
                  courseId,
                  promotionId: promotionId || undefined,
                  codes: splitCodes(promoCodes),
                });
                if (created.error || !created.installmentId) {
                  setBusy(false);
                  setError(created.error);
                  return;
                }
                if (payMethod !== "debt" && created.payable > 0) {
                  const paid = await payReceivable({
                    receivableId: created.installmentId,
                    amount: created.payable,
                    method: (payMethod === "cash" ? "cash" : "transfer") as PayMethod,
                  });
                  setBusy(false);
                  if (typeof paid === "string") {
                    setError(paid);
                    return;
                  }
                  setDone(`${t.money.collected} ${formatVnd(paid.amount)}`);
                } else {
                  setBusy(false);
                  setDone(payMethod === "debt" ? t.pages.boughtDebt : t.pages.bought);
                }
                setStudentId("");
                setPlanId("");
                setCourseId("");
                setPromotionId("");
                setPromoCodes("");
                setPayMethod("cash");
              })();
            }}
          >
            <div className="grid gap-3 md:grid-cols-4 md:items-end">
              <Field label={t.common.student}>
                <select className={inputClass} value={studentId} onChange={(e) => { setStudentId(e.target.value); setPromotionId(""); }}>
                  <option value="">{t.common.choose}</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label={t.pages.pack}>
                <select className={inputClass} value={planId} onChange={(e) => { setPlanId(e.target.value); setPromotionId(""); }}>
                  <option value="">{t.common.choose}</option>
                  {plans.filter((p) => p.kind === "course").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label={t.common.course}>
                <select className={inputClass} value={courseId} onChange={(e) => { setCourseId(e.target.value); setPromotionId(""); }}>
                  <option value="">{t.common.choose}</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Button className="min-h-12 w-full" type="submit" disabled={busy || !sku || !course || !buyer}>
                {payMethod === "debt" || payable <= 0 ? t.pages.enroll : `${t.money.payCta} · ${formatVnd(payable)}`}
              </Button>
            </div>
            {sku && course && buyer ? (
              <div className="space-y-3">
                <PromotionPicker
                  promotions={promotions}
                  tuition={sku.price}
                  course={course}
                  usedIds={usedPromoIds}
                  selectedId={promotionId}
                  codes={promoCodes}
                  onSelect={setPromotionId}
                  onCodes={setPromoCodes}
                />
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-slate-500">{t.promo.listPrice}</dt>
                  <dd className="text-right tabular-nums">{formatVnd(sku.price)}</dd>
                  <dt className="text-slate-500">{t.promo.cut}</dt>
                  <dd className="text-right tabular-nums">{formatVnd(promoQuote?.quote?.discount ?? 0)}</dd>
                  <dt className="font-semibold">{t.promo.payable}</dt>
                  <dd className="text-right text-base font-bold tabular-nums">{formatVnd(payable)}</dd>
                </dl>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    ["cash", t.money.methodCash],
                    ["transfer", t.money.methodCk],
                    ["debt", t.money.methodDebt],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPayMethod(id)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-sm font-semibold",
                        payMethod === id
                          ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                          : "border-slate-200 text-slate-700",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {payMethod === "transfer" && payable > 0 ? (
                  <TransferQr
                    amount={payable}
                    studentName={buyer.name}
                    studentPhone={buyer.phone}
                    studio={settings?.name}
                    account={payAccount}
                    memo={transferMemo(buyer.name)}
                  />
                ) : null}
                {payMethod === "debt" ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{t.money.debtNote}</p>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {done ? <p className="text-sm text-green-800">{done}</p> : null}
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-bold">{t.pages.subActive}</h2>
        <div className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {[t.common.student, t.common.course, t.pages.pack, t.pages.fromDay, t.pages.subEnd, t.pages.subLeft, t.common.status].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((sub) => {
                const student = students.find((s) => s.id === sub.studentId);
                const course = courses.find((c) => c.id === sub.courseId);
                const plan = plans.find((p) => p.id === sub.planId);
                const valid = isSubscriptionValid(sub, { day: today, courseId: sub.courseId });
                const renew = needsRenew(sub, today);
                return (
                  <tr key={sub.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      {student ? (
                        <Link href={`/students/${student.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">{student.name}</Link>
                      ) : sub.studentId}
                    </td>
                    <td className="px-3 py-3">
                      {course ? (
                        <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link>
                      ) : sub.courseId}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{plan?.name ?? sub.planId}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.day}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.endDay}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.remainingSessions}</td>
                    <td className="px-3 py-3">
                      {renew || !valid ? (
                        <Badge tone="danger">{t.pages.renew}</Badge>
                      ) : (
                        <Badge tone="ok">{sub.status}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CreatePlanForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("8");
  const [months, setMonths] = useState("1");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-3 grid gap-3 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(sessions) || 0;
        const m = Number(months) || 0;
        const p = Number(price) || 0;
        if (!name.trim() || n <= 0 || m <= 0 || p <= 0) return;
        void addPackage({ name, sessions: n, months: m, price: p, note }).then(() => {
          setName("");
          setSessions("8");
          setMonths("1");
          setPrice("");
          setNote("");
        });
      }}
    >
      <Field label={t.pages.packageName}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t.pages.duration}><input className={inputClass} type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
      <Field label={t.pages.skuSessions}><input className={inputClass} type="number" min={1} value={sessions} onChange={(e) => setSessions(e.target.value)} /></Field>
      <Field label={t.pages.fee}><input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <Field label={t.money.note}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="md:col-span-4">
        <Button type="submit">{t.pages.savePackage}</Button>
      </div>
    </form>
  );
}
