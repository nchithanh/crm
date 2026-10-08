"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card, inputClassInline } from "@/components/ui";
import { AgingCard, FinanceTabs, KpiCard } from "@/components/finance/widgets";
import { canSeeMoney } from "@/lib/access";
import { agingSums, debtUiStatus } from "@/lib/finance/metrics";
import { db } from "@/lib/db";
import { debtRemaining } from "@/lib/metrics";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

export default function FinanceDebtsPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const open = useMemo(
    () => installments.filter((r) => (branchId === "all" || r.branchId === branchId) && debtRemaining(r) > 0),
    [installments, branchId],
  );
  const aging = agingSums(open);
  const overdueSum = open.filter((r) => debtUiStatus(r) === "overdue").reduce((s, r) => s + debtRemaining(r), 0);
  const soonSum = open.filter((r) => debtUiStatus(r) === "due_soon").reduce((s, r) => s + debtRemaining(r), 0);

  const filtered = useMemo(() => {
    return open.filter((r) => {
      const st = students.find((s) => s.id === r.studentId);
      const hay = `${st?.name ?? ""} ${r.title}`.toLowerCase();
      if (q && !hay.includes(q.trim().toLowerCase())) return false;
      if (status !== "all" && debtUiStatus(r) !== status) return false;
      return true;
    }).sort((a, b) => a.dueDay.localeCompare(b.dueDay));
  }, [open, students, q, status]);

  const payRows = useMemo(
    () =>
      [...payments]
        .filter((p) => branchId === "all" || p.branchId === branchId)
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, 40),
    [payments, branchId],
  );

  if (!canSeeMoney(role)) {
    return (
      <div>
        <h1 className="crm-page-title">{t.finance.debtsTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.money.teacher}</p>
      </div>
    );
  }

  function statusBadge(st: ReturnType<typeof debtUiStatus>) {
    if (st === "overdue") return <Badge tone="danger">{t.status.overdue}</Badge>;
    if (st === "due_soon") return <Badge tone="warn">{t.finance.dueSoon}</Badge>;
    return <Badge tone="ok">{t.finance.statusOk}</Badge>;
  }

  return (
    <div>
      <h1 className="crm-page-title">{t.finance.debtsTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.finance.debtsLead}</p>

      <div className="mt-4">
        <FinanceTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "overview", label: t.finance.tabOverview },
            { id: "recv", label: t.finance.tabRecv },
            { id: "payments", label: t.finance.tabPayments },
          ]}
        />
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label={t.finance.openDebt} value={formatVnd(aging.total)} />
            <KpiCard label={t.finance.overdueDebt} value={formatVnd(overdueSum)} valueClass="text-rose-600" />
            <KpiCard label={t.finance.dueSoon} value={formatVnd(soonSum)} valueClass="text-amber-700" />
          </div>
          <AgingCard
            title={t.finance.agingTitle}
            total={aging.total}
            buckets={aging.buckets}
            labels={[
              { key: "0-7", label: t.finance.age07 },
              { key: "8-30", label: t.finance.age830 },
              { key: "31-60", label: t.finance.age3160 },
              { key: "60+", label: t.finance.age60 },
            ]}
          />
        </div>
      ) : null}

      {tab === "recv" ? (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <input className={inputClassInline} style={{ minWidth: "14rem" }} placeholder={t.finance.searchDebt} value={q} onChange={(e) => setQ(e.target.value)} />
            <select className={inputClassInline} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t.finance.statusAll}</option>
              <option value="ok">{t.finance.statusOk}</option>
              <option value="due_soon">{t.finance.statusSoon}</option>
              <option value="overdue">{t.finance.statusOverdue}</option>
            </select>
          </div>
          <Card className="overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  {[t.finance.student, t.finance.item, t.finance.due, t.finance.remain, t.common.status, ""].map((h) => (
                    <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">{t.finance.noOpen}</td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const st = debtUiStatus(r);
                    const student = students.find((s) => s.id === r.studentId);
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-medium">{student?.name}</td>
                        <td className="px-3 py-3">{r.title}</td>
                        <td className="px-3 py-3 tabular-nums">{r.dueDay}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{formatVnd(debtRemaining(r))}</td>
                        <td className="px-3 py-3">{statusBadge(st)}</td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/finance/collect?student=${r.studentId}`} className="font-semibold text-[var(--brand-600)]">
                            {t.finance.pay}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {tab === "payments" ? (
        <Card className="overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {[t.money.day, t.finance.student, t.money.amount, t.money.method, t.money.note].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payRows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 tabular-nums">{p.day}</td>
                  <td className="px-3 py-3">{students.find((s) => s.id === p.studentId)?.name}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums">{formatVnd(p.amount)}</td>
                  <td className="px-3 py-3">{p.method === "cash" ? t.common.cash : t.common.transfer}</td>
                  <td className="px-3 py-3 text-slate-500">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
