"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, inputClassInline } from "@/components/ui";
import { DateRangeFilter, KpiCard, useRangeState } from "@/components/finance/widgets";
import { canSeeMoney } from "@/lib/access";
import { periodSnapshot } from "@/lib/finance/metrics";
import { dateWindow, dayInWindow } from "@/lib/finance/range";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { PayMethod } from "@/types";

export default function FinanceLedgerPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const branch = branchId === "all" ? null : branchId;
  const range = useRangeState("30d");
  const [method, setMethod] = useState<"all" | PayMethod>("all");
  const [q, setQ] = useState("");

  const bounds = dateWindow(range.range, new Date(), { from: range.from, to: range.to });
  const snap = useMemo(() => periodSnapshot(payments, bounds, branch), [payments, bounds, branch]);

  const rows = useMemo(() => {
    return [...payments]
      .filter((p) => {
        if (!dayInWindow(p.day, bounds.start, bounds.end)) return false;
        if (branch && p.branchId !== branch) return false;
        if (method !== "all" && p.method !== method) return false;
        const name = students.find((s) => s.id === p.studentId)?.name ?? "";
        if (q && !`${name} ${p.note}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [payments, students, bounds, branch, method, q]);

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="crm-page-title">{t.finance.ledgerTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.finance.ledgerTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.finance.ledgerLead}</p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label={t.finance.collected} value={formatVnd(snap.collected)} />
        <KpiCard label={t.finance.cash} value={formatVnd(snap.cash)} valueClass="text-emerald-700" />
        <KpiCard label={t.finance.transfer} value={formatVnd(snap.transfer)} valueClass="text-sky-700" />
      </div>

      <div className="flex flex-wrap gap-2">
        <input className={inputClassInline} style={{ minWidth: "14rem" }} placeholder={t.money.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClassInline} value={method} onChange={(e) => setMethod(e.target.value as "all" | PayMethod)}>
          <option value="all">{t.money.method}</option>
          <option value="cash">{t.common.cash}</option>
          <option value="transfer">{t.common.transfer}</option>
        </select>
      </div>

      <Card className="overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {[t.money.day, t.finance.student, t.money.amount, t.money.method, t.money.note].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">{t.money.empty}</td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 tabular-nums">{p.day}</td>
                  <td className="px-3 py-3 font-medium">{students.find((s) => s.id === p.studentId)?.name}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-emerald-700">{formatVnd(p.amount)}</td>
                  <td className="px-3 py-3">{p.method === "cash" ? t.common.cash : t.common.transfer}</td>
                  <td className="px-3 py-3 text-slate-500">{p.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
