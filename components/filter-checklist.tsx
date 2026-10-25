"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";

const PALETTE = ["#5d5cc4", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];

/** Màu checkbox lọc — palette cố định theo hash id. design-language.md */
export function filterColorOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export type FilterRowDef = {
  key: string;
  label: string;
  count: number;
  color: string;
  checked: boolean;
  onToggle: () => void;
};

export function FilterRow({ def }: { def: FilterRowDef }) {
  return (
    <button type="button" onClick={def.onToggle} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--brand-50)]">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition"
        style={def.checked ? { backgroundColor: def.color, borderColor: def.color } : { borderColor: `${def.color}66` }}
      >
        {def.checked ? <Check size={13} strokeWidth={3.5} className="text-white" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{def.label}</span>
      <span className="text-xs tabular-nums text-[var(--muted)]">{def.count}</span>
    </button>
  );
}

export function FilterGroup({ title, sections }: { title: string; sections: { subtitle?: string; rows: FilterRowDef[] }[] }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  if (total === 0) return null;
  const visible: Array<{ kind: "sub"; label: string } | { kind: "row"; def: FilterRowDef }> = [];
  let shown = 0;
  for (const section of sections) {
    const take = expanded ? section.rows.length : Math.min(section.rows.length, Math.max(0, 6 - shown));
    if (take === 0) continue;
    if (section.subtitle) visible.push({ kind: "sub", label: section.subtitle });
    for (const def of section.rows.slice(0, take)) visible.push({ kind: "row", def });
    shown += take;
  }
  return (
    <section className="crm-card-elev p-4">
      <h3 className="crm-section-title">{title}</h3>
      <div className="mt-1.5">
        {visible.map((item, i) =>
          item.kind === "sub" ? (
            <p key={`sub-${i}`} className="px-2 pt-1.5 text-xs font-semibold text-[var(--muted)]">{item.label}</p>
          ) : (
            <FilterRow key={item.def.key} def={item.def} />
          ),
        )}
      </div>
      {total > 6 ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)]">
          {expanded ? t.common.filterShowLess : fill(t.common.filterShowMore, { n: total - 6 })}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      ) : null}
    </section>
  );
}
