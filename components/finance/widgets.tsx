"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";
import { RANGE_OPTIONS, formatPct, type RangeKey } from "@/lib/finance/range";
import { useI18n } from "@/lib/i18n";
import { cn, formatVnd } from "@/lib/utils";

const CHART_GRID = "#e2e8f0";
const COLOR_IN = "#10B981";

export function Sparkline({ points, up = true }: { points: number[]; up?: boolean }) {
  const nums = points.length > 1 ? points : [0, 0];
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const span = max - min || 1;
  const w = 72;
  const h = 28;
  const d = nums
    .map((n, i) => {
      const x = (i / (nums.length - 1)) * w;
      const y = h - ((n - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className={cn("h-7 w-[72px] shrink-0", up ? "text-emerald-500" : "text-rose-500")}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  spark,
  valueClass,
  vsPrev,
}: {
  label: string;
  value: string;
  delta?: number;
  spark?: number[];
  valueClass?: string;
  vsPrev?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="min-w-[160px] flex-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {spark ? <Sparkline points={spark} up={up} /> : null}
      </div>
      <p className={cn("mt-1 text-xl font-bold tracking-tight tabular-nums", valueClass)}>{value}</p>
      {delta != null ? (
        <p className={cn("mt-1 text-xs font-semibold", up ? "text-emerald-600" : "text-rose-600")}>
          {formatPct(delta)} {vsPrev || ""}
        </p>
      ) : null}
    </Card>
  );
}

export function DateRangeFilter({
  value,
  onChange,
  from,
  to,
  onFrom,
  onTo,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm">
        <span className="sr-only">{t.finance.range}</span>
        <select
          className="h-10 min-w-[9rem] rounded-[10px] border border-[#E2E8F0] bg-white px-3 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value as RangeKey)}
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {lang === "en" ? o.labelEn : o.labelVi}
            </option>
          ))}
        </select>
      </label>
      {value === "custom" ? (
        <div className="flex gap-2">
          <input
            type="date"
            aria-label={t.finance.fromDay}
            className="h-10 rounded-[10px] border border-[#E2E8F0] px-2 text-sm"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
          <input
            type="date"
            aria-label={t.finance.toDay}
            className="h-10 rounded-[10px] border border-[#E2E8F0] px-2 text-sm"
            value={to}
            onChange={(e) => onTo(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function useRangeState(initial: RangeKey = "month") {
  const [range, setRange] = useState<RangeKey>(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return { range, setRange, from, setFrom, to, setTo };
}

export function EmptyBlock({ text }: { text: string }) {
  return (
    <p className="rounded-[10px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}

export function FinanceTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold",
            value === o.id
              ? "bg-[var(--brand-500)] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CollectionChart({ data, empty }: { data: { label: string; amount: number }[]; empty: string }) {
  if (!data.some((d) => d.amount)) return <EmptyBlock text={empty} />;
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip formatter={(v) => formatVnd(Number(v ?? 0))} />
          <Area type="monotone" dataKey="amount" stroke={COLOR_IN} fill="#10B98133" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBar({
  data,
  xKey,
  yKey,
  empty,
  fill = COLOR_IN,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  empty: string;
  fill?: string;
}) {
  if (!data.length || !data.some((r) => Number(r[yKey]) > 0)) return <EmptyBlock text={empty} />;
  const mixed = data.some((row) => typeof row.color === "string");
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip formatter={(v) => formatVnd(Number(v ?? 0))} />
          <Bar dataKey={yKey} fill={fill} radius={[6, 6, 0, 0]}>
            {mixed ? data.map((row, i) => <Cell key={i} fill={String(row.color ?? fill)} />) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AgingCard({
  title,
  total,
  buckets,
  labels,
}: {
  title: string;
  total: number;
  buckets: Record<string, number>;
  labels: { key: string; label: string }[];
}) {
  const max = Math.max(...labels.map((l) => buckets[l.key] || 0), 1);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="crm-section-title">{title}</h2>
        <p className="text-lg font-bold tabular-nums">{formatVnd(total)}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {labels.map((l) => {
          const amount = buckets[l.key] || 0;
          return (
            <li key={l.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600">{l.label}</span>
                <span className="font-semibold tabular-nums">{formatVnd(amount)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    l.key === "60+" || l.key === "31-60" ? "bg-rose-400" : l.key === "8-30" ? "bg-amber-400" : "bg-emerald-400",
                  )}
                  style={{ width: `${Math.round((amount / max) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
