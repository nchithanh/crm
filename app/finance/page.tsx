"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, ctaOutline, ctaPrimary } from "@/components/ui";
import {
  AgingCard,
  CollectionChart,
  DateRangeFilter,
  KpiCard,
  useRangeState,
} from "@/components/finance/widgets";
import { canSeeMoney } from "@/lib/access";
import {
  agingSums,
  collectionSeries,
  debtUiStatus,
  periodSnapshot,
  watchDebts,
} from "@/lib/finance/metrics";
import { dateWindow } from "@/lib/finance/range";
import { db } from "@/lib/db";
import { debtRemaining } from "@/lib/metrics";
import { useI18n } from "@/lib/i18n";
import { formatVnd, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

export default function FinanceOverviewPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const branch = branchId === "all" ? null : branchId;
  const range = useRangeState("month");
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const view = useMemo(() => {
    const bounds = dateWindow(range.range, new Date(), { from: range.from, to: range.to });
    const snap = periodSnapshot(payments, bounds, branch);
    const open = installments.filter((r) => (!branch || r.branchId === branch) && debtRemaining(r) > 0);
    const aging = agingSums(open);
    const overdue = open.filter((r) => debtUiStatus(r) === "overdue").reduce((s, r) => s + debtRemaining(r), 0);
    const soon = open.filter((r) => debtUiStatus(r) === "due_soon").reduce((s, r) => s + debtRemaining(r), 0);
    const chart = collectionSeries(payments, days, branch);
    const watch = watchDebts(open, 6);
    return { snap, aging, overdue, soon, chart, watch, spark: chart.map((p) => p.amount) };
  }, [payments, installments, branch, range.range, range.from, range.to, days]);

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="crm-page-title">{t.finance.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.finance.overview}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.finance.lead}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            value={range.range}
            onChange={range.setRange}
            from={range.from}
            to={range.to}
            onFrom={range.setFrom}
            onTo={range.setTo}
          />
          <Link href="/collect-fees" className={ctaPrimary}>
            {t.finance.collectCta}
          </Link>
          <Link href="/receivables" className={ctaOutline}>
            {t.finance.debtsCta}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label={t.finance.collected} value={formatVnd(view.snap.collected)} delta={view.snap.delta} spark={view.spark} vsPrev={t.finance.vsPrev} href="/finance/ledger" />
        <KpiCard label={t.finance.cash} value={formatVnd(view.snap.cash)} valueClass="text-emerald-700" href="/finance/ledger" />
        <KpiCard label={t.finance.transfer} value={formatVnd(view.snap.transfer)} valueClass="text-sky-700" href="/finance/ledger" />
        <KpiCard label={t.finance.openDebt} value={formatVnd(view.aging.total)} href="/receivables" />
        <KpiCard label={t.finance.overdueDebt} value={formatVnd(view.overdue)} valueClass="text-rose-600" href="/receivables" />
        <KpiCard label={t.finance.dueSoon} value={formatVnd(view.soon)} valueClass="text-amber-700" href="/receivables" />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="crm-section-title">{t.finance.chartTitle}</h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 rounded-full px-3 text-sm font-semibold ${days === n ? "bg-[var(--brand-500)] text-white" : "bg-slate-100 text-slate-600"}`}
                  onClick={() => setDays(n)}
                >
                  {n === 7 ? t.finance.days7 : n === 30 ? t.finance.days30 : t.finance.days90}
                </button>
              ))}
            </div>
          </div>
          <CollectionChart data={view.chart} empty={t.finance.chartEmpty} />
        </Card>
        <AgingCard
          title={t.finance.agingTitle}
          total={view.aging.total}
          buckets={view.aging.buckets}
          labels={[
            { key: "0-7", label: t.finance.age07 },
            { key: "8-30", label: t.finance.age830 },
            { key: "31-60", label: t.finance.age3160 },
            { key: "60+", label: t.finance.age60 },
          ]}
        />
      </section>

      <Card className="p-4">
        <h2 className="crm-section-title">{t.finance.watchTitle}</h2>
        {view.watch.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.finance.watchEmpty}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {view.watch.map((row) => {
              const st = debtUiStatus(row);
              const student = students.find((s) => s.id === row.studentId);
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-slate-100 px-3 py-2 text-sm">
                  <span>
                    <span className="block font-semibold">{student?.name ?? row.studentId}</span>
                    <span className={st === "overdue" ? "text-rose-600" : "text-amber-700"}>
                      {st === "overdue" ? t.status.overdue : t.finance.dueSoon} · {t.finance.due} {row.dueDay}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{formatVnd(debtRemaining(row))}</span>
                  <Link href={`/collect-fees?student=${row.studentId}`} className="text-sm font-semibold text-[var(--brand-600)]">
                    {st === "overdue" ? t.finance.remind : t.finance.pay}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">{localDayKey()}</p>
      </Card>
    </div>
  );
}
