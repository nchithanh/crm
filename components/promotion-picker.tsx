"use client";

import { useEffect, useMemo } from "react";
import { inputClass } from "@/components/ui";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { benefitText, eligiblePromotions, quotePromotion, splitCodes } from "@/lib/promotions";
import { formatVnd } from "@/lib/utils";
import type { Course, Promotion } from "@/types";

export function PromotionPicker({
  promotions,
  tuition,
  course,
  usedIds,
  selectedId,
  codes,
  onSelect,
  onCodes,
  lockedName,
}: {
  promotions: Promotion[];
  tuition: number;
  course?: Course;
  usedIds: string[];
  selectedId: string;
  codes: string;
  onSelect: (id: string) => void;
  onCodes: (value: string) => void;
  lockedName?: string;
}) {
  const { t } = useI18n();
  const entered = useMemo(() => splitCodes(codes), [codes]);
  const { autos, coded } = useMemo(
    () => eligiblePromotions({ promotions, tuition, course, codes: entered, usedIds }),
    [promotions, tuition, course, entered, usedIds],
  );
  const codedKey = coded.map((row) => row.id).join(",");

  useEffect(() => {
    if (!coded[0]) return;
    onSelect(coded[0].id);
  }, [codedKey]);

  if (lockedName) {
    return (
      <p className="rounded-xl bg-[var(--brand-50)] px-3 py-2 text-sm text-[var(--brand-700)]">
        {t.promo.usedName}: {lockedName}
      </p>
    );
  }

  const selected = [...autos, ...coded].find((row) => row.id === selectedId);
  const quoted = selected
    ? quotePromotion({
        promotion: selected,
        tuition,
        course,
        codes: entered,
        alreadyUsed: usedIds.includes(selected.id),
      }).quote
    : null;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold">{t.promo.picker}</p>
      {autos.length === 0 ? <p className="text-sm text-slate-500">{t.promo.noneMatch}</p> : null}
      <ul className="space-y-1">
        {autos.map((row) => (
          <li key={row.id}>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="promotion"
                checked={selectedId === row.id}
                onChange={() => onSelect(row.id)}
              />
              <span className="font-semibold">{row.name}</span>
              <span className="text-slate-500">{benefitText(row)} · {t.promo.auto}</span>
            </label>
          </li>
        ))}
        {coded.map((row) => (
          <li key={row.id}>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="promotion"
                checked={selectedId === row.id}
                onChange={() => onSelect(row.id)}
              />
              <span className="font-semibold">{row.name}</span>
              <span className="text-slate-500">{benefitText(row)} · {row.codeMode === "and" ? t.promo.codeAnd : t.promo.codeOr}</span>
            </label>
          </li>
        ))}
      </ul>
      {selectedId ? (
        <button type="button" className="text-xs font-semibold text-[var(--brand-600)]" onClick={() => onSelect("")}>
          {t.promo.clear}
        </button>
      ) : null}
      <input
        className={inputClass}
        placeholder={t.promo.codePlaceholder}
        value={codes}
        onChange={(event) => onCodes(event.target.value)}
      />
      {quoted ? (
        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-slate-500">{t.promo.listPrice}</dt>
          <dd className="text-right tabular-nums">{formatVnd(quoted.listPrice)}</dd>
          <dt className="text-slate-500">{t.promo.cut}</dt>
          <dd className="text-right tabular-nums">{formatVnd(quoted.discount)}</dd>
          <dt className="font-semibold">{t.promo.payable}</dt>
          <dd className="text-right font-semibold tabular-nums">{formatVnd(quoted.payable)}</dd>
          {quoted.extraSessions > 0 ? (
            <dd className="col-span-2 text-[var(--brand-700)]">{fill(t.promo.extra, { n: quoted.extraSessions })}</dd>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
