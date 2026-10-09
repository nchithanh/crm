"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui";
import {
  DateRangeFilter,
  FinanceTabs,
  KpiCard,
  SimpleBar,
  useRangeState,
} from "@/components/finance/widgets";
import { canSeeMoney } from "@/lib/access";
import { periodSnapshot, revenueByCourse, revenueByMethod } from "@/lib/finance/metrics";
import { dateWindow, dayInWindow } from "@/lib/finance/range";
import { db } from "@/lib/db";
import { debtRemaining } from "@/lib/metrics";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

export default function FinanceRevenuePage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const branch = branchId === "all" ? null : branchId;
  const range = useRangeState("month");
  const [tab, setTab] = useState("overview");

  const bounds = dateWindow(range.range, new Date(), { from: range.from, to: range.to });
  const snap = useMemo(() => periodSnapshot(payments, bounds, branch), [payments, bounds, branch]);
  const byMethod = useMemo(() => {
    const rows = revenueByMethod(payments, bounds, branch);
    return rows.map((r) => ({
      ...r,
      name: r.name === "cash" ? t.finance.methodCash : t.finance.methodTransfer,
    }));
  }, [payments, bounds, branch, t]);
  const byCourse = useMemo(() => revenueByCourse(payments, students, courses, bounds, branch), [payments, students, courses, bounds, branch]);
  const byBranch = useMemo(() => {
    return branches
      .filter((b) => !branch || b.id === branch)
      .map((b) => ({
        name: b.name,
        value: payments
          .filter((p) => p.branchId === b.id && dayInWindow(p.day, bounds.start, bounds.end))
          .reduce((s, p) => s + p.amount, 0),
        debt: installments.filter((r) => r.branchId === b.id).reduce((s, r) => s + debtRemaining(r), 0),
      }));
  }, [branches, branch, payments, installments, bounds]);

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="crm-page-title">{t.finance.revenueTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.finance.revenueTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.finance.revenueLead}</p>
        </div>
        <DateRangeFilter
          value={range.range}
          onChange={range.setRange}
          from={range.from}
          to={range.to}
          onFrom={range.setFrom}
          onTo={range.setTo}
        />
      </div>

      <FinanceTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: "overview", label: t.finance.tabOverview },
          { id: "method", label: t.finance.byMethod },
          { id: "course", label: t.finance.byCourse },
          { id: "branch", label: t.finance.byBranch },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label={t.finance.collected} value={formatVnd(snap.collected)} delta={snap.delta} vsPrev={t.finance.vsPrev} />
        <KpiCard label={t.finance.cash} value={formatVnd(snap.cash)} valueClass="text-emerald-700" />
        <KpiCard label={t.finance.transfer} value={formatVnd(snap.transfer)} valueClass="text-sky-700" />
      </div>

      {tab === "overview" || tab === "method" ? (
        <Card className="p-4">
          <h2 className="crm-section-title mb-3">{t.finance.byMethod}</h2>
          <SimpleBar data={byMethod} xKey="name" yKey="value" empty={t.finance.noChart} />
        </Card>
      ) : null}

      {tab === "course" ? (
        <Card className="p-4">
          <h2 className="crm-section-title mb-3">{t.finance.byCourse}</h2>
          <SimpleBar data={byCourse} xKey="name" yKey="value" empty={t.finance.noChart} />
        </Card>
      ) : null}

      {tab === "branch" || tab === "overview" ? (
        <Card className="overflow-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {[t.finance.branch, t.finance.collected, t.money.debt].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byBranch.map((b) => (
                <tr key={b.name} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium">{b.name}</td>
                  <td className="px-3 py-3 tabular-nums">{formatVnd(b.value)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatVnd(b.debt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
