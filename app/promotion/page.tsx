"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, inputClass } from "@/components/ui";
import { canManagePromotions } from "@/lib/access";
import { savePromotion } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { asPromotion, benefitText, promotionPhase, type PromotionPhase } from "@/lib/promotions";
import { cn, formatVnd, localDayKey, weekdayShort } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Promotion, PromotionBenefit, PromotionCodeMode } from "@/types";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

type CodeDraft = { code: string; maxUses: string };

type Draft = {
  id: string;
  name: string;
  startDay: string;
  endDay: string;
  weekdays: number[];
  branchIds: string[];
  courseIds: string[];
  minTuition: string;
  benefit: PromotionBenefit;
  benefitValue: string;
  codeMode: PromotionCodeMode;
  codes: CodeDraft[];
  oncePerStudent: boolean;
  active: boolean;
  note: string;
};

function emptyDraft(): Draft {
  const today = localDayKey();
  return {
    id: "",
    name: "",
    startDay: today,
    endDay: today,
    weekdays: [],
    branchIds: [],
    courseIds: [],
    minTuition: "",
    benefit: "percent",
    benefitValue: "",
    codeMode: "none",
    codes: [{ code: "", maxUses: "" }],
    oncePerStudent: false,
    active: true,
    note: "",
  };
}

function draftFrom(row: Promotion): Draft {
  const promo = asPromotion(row);
  return {
    id: promo.id,
    name: promo.name,
    startDay: promo.startDay,
    endDay: promo.endDay,
    weekdays: promo.weekdays,
    branchIds: promo.branchIds,
    courseIds: promo.courseIds,
    minTuition: promo.minTuition == null ? "" : String(promo.minTuition),
    benefit: promo.benefit,
    benefitValue: String(promo.benefitValue || ""),
    codeMode: promo.codeMode,
    codes: promo.codes.length > 0
      ? promo.codes.map((code) => ({ code: code.code, maxUses: code.maxUses == null ? "" : String(code.maxUses) }))
      : [{ code: "", maxUses: "" }],
    oncePerStudent: promo.oncePerStudent,
    active: promo.active,
    note: promo.note,
  };
}

export default function PromotionsPage() {
  const { lang, t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManagePromotions(role);
  const rows = (useLiveQuery(() => db.promotions.toArray(), []) ?? []).map(asPromotion);
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [phase, setPhase] = useState<PromotionPhase>("running");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const visible = useMemo(
    () => rows.filter((row) => promotionPhase(row) === phase).sort((a, b) => a.name.localeCompare(b.name)),
    [rows, phase],
  );

  const preview = useMemo(() => {
    if (!draft) return "";
    const days = draft.weekdays.length === 0
      ? t.promo.allDays
      : draft.weekdays.map((day) => weekdayShort(day, lang)).join(", ");
    const benefit = draft.benefit === "percent"
      ? `${draft.benefitValue || 0}%`
      : draft.benefit === "sessions"
        ? `${draft.benefitValue || 0} buổi`
        : formatVnd(Number(draft.benefitValue) || 0);
    const mode = draft.codeMode === "none" ? t.promo.codeNone : draft.codeMode === "or" ? t.promo.codeOr : t.promo.codeAnd;
    const codes = draft.codes.map((code) => code.code.trim()).filter(Boolean).join(", ");
    const threshold = draft.minTuition.trim() ? formatVnd(Number(draft.minTuition) || 0) : "";
    return [draft.startDay && draft.endDay ? `${draft.startDay} → ${draft.endDay}` : "", days, threshold ? `${t.promo.threshold} ${threshold}` : "", benefit, mode, codes]
      .filter(Boolean)
      .join(" · ");
  }, [draft, lang, t]);

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const code = await savePromotion({
      id: draft.id || undefined,
      role,
      name: draft.name,
      startDay: draft.startDay,
      endDay: draft.endDay,
      weekdays: draft.weekdays,
      branchIds: draft.branchIds,
      courseIds: draft.courseIds,
      minTuition: draft.minTuition.trim() ? Number(draft.minTuition) : null,
      benefit: draft.benefit,
      benefitValue: Number(draft.benefitValue),
      codeMode: draft.codeMode,
      codes: draft.codes.map((row) => ({
        code: row.code,
        maxUses: row.maxUses.trim() ? Number(row.maxUses) : null,
      })),
      oncePerStudent: draft.oncePerStudent,
      active: draft.active,
      note: draft.note,
    });
    setBusy(false);
    const message: Record<string, string> = {
      owner: t.promo.ownerOnly,
      name: t.promo.needName,
      date: t.promo.needDate,
      value: t.promo.needValue,
      percent: t.promo.needPercent,
      codes: t.promo.needCodes,
      and: t.promo.needAnd,
      dup: t.promo.needDup,
    };
    if (code) {
      setError(message[code] || code);
      return;
    }
    setDraft(null);
    setError("");
  }

  async function copyCodes(row: Promotion) {
    const text = row.codes.map((code) => code.code).join(", ");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(row.id);
  }

  const phases: PromotionPhase[] = ["running", "upcoming", "off"];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.pages.promotion}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.promo.lead}</p>
        </div>
        {manage ? <Button className="min-h-12" onClick={() => { setDraft(emptyDraft()); setError(""); }}>{t.promo.create}</Button> : null}
      </div>
      <div className="mt-4 flex gap-2">
        {phases.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "h-9 rounded-xl px-3 text-sm font-semibold",
              phase === item ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-white text-slate-600",
            )}
            onClick={() => setPhase(item)}
          >
            {t.promo[item]}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="mt-4 text-sm text-slate-500">{t.promo.empty}</p> : null}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((row) => (
          <li key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">{row.name}</h2>
              <Badge tone={row.codeMode === "none" ? "info" : "neutral"}>
                {row.codeMode === "none" ? t.promo.auto : row.codeMode === "or" ? t.promo.codeOr : t.promo.codeAnd}
              </Badge>
            </div>
            <p className="mt-2 text-lg font-bold text-[var(--brand-700)]">{benefitText(row)}</p>
            <p className="mt-1 text-sm text-slate-500">{row.startDay} → {row.endDay}</p>
            <p className="mt-1 text-sm text-slate-600">
              {row.weekdays.length === 0 ? t.promo.allDays : row.weekdays.map((day) => weekdayShort(day, lang)).join(" · ")}
            </p>
            {row.minTuition != null ? <p className="mt-1 text-sm text-slate-600">{t.promo.threshold} {formatVnd(row.minTuition)}</p> : null}
            {row.codes.length > 0 ? (
              <p className="mt-2 text-sm font-semibold">{row.codes.map((code) => code.code).join(", ")}</p>
            ) : null}
            {row.note ? <p className="mt-2 text-sm text-slate-500">{row.note}</p> : null}
            <div className="mt-3 flex gap-2">
              {manage ? (
                <Button variant="outline" className="h-10 min-h-10" onClick={() => { setDraft(draftFrom(row)); setError(""); }}>{t.promo.edit}</Button>
              ) : null}
              {row.codes.length > 0 ? (
                <Button variant="ghost" className="h-10 min-h-10" onClick={() => void copyCodes(row)}>
                  {copied === row.id ? t.promo.copied : t.promo.copy}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <form
            className="flex h-full w-[80%] max-w-md flex-col overflow-y-auto bg-white p-4"
            onSubmit={(event) => { event.preventDefault(); void save(); }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{draft.id ? t.promo.edit : t.promo.create}</h2>
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setDraft(null)}>{t.common.close}</button>
            </div>
            <label className="mt-4 block text-sm">{t.promo.name}
              <input className={`${inputClass} mt-1`} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm">{t.promo.from}
                <input className={`${inputClass} mt-1`} type="date" value={draft.startDay} onChange={(event) => setDraft({ ...draft, startDay: event.target.value })} />
              </label>
              <label className="text-sm">{t.promo.to}
                <input className={`${inputClass} mt-1`} type="date" value={draft.endDay} onChange={(event) => setDraft({ ...draft, endDay: event.target.value })} />
              </label>
            </div>
            <p className="mt-3 text-sm">{t.promo.weekdays}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    "h-9 rounded-xl px-2 text-xs font-semibold",
                    draft.weekdays.includes(day) ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-white",
                  )}
                  onClick={() => setDraft({ ...draft, weekdays: toggle(draft.weekdays, day) })}
                >
                  {weekdayShort(day, lang)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{draft.weekdays.length === 0 ? t.promo.allDays : ""}</p>
            <p className="mt-3 text-sm">{t.promo.branches}</p>
            <div className="mt-1 space-y-1">
              {branches.map((branch) => (
                <label key={branch.id} className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.branchIds.includes(branch.id)} onChange={() => setDraft({ ...draft, branchIds: toggle(draft.branchIds, branch.id) })} />
                  {branch.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{draft.branchIds.length === 0 ? t.promo.allBranches : ""}</p>
            <p className="mt-3 text-sm">{t.promo.courses}</p>
            <div className="mt-1 max-h-36 space-y-1 overflow-auto">
              {courses.map((course) => (
                <label key={course.id} className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.courseIds.includes(course.id)} onChange={() => setDraft({ ...draft, courseIds: toggle(draft.courseIds, course.id) })} />
                  {course.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{draft.courseIds.length === 0 ? t.promo.allCourses : ""}</p>
            <label className="mt-3 block text-sm">{t.promo.threshold}
              <input className={`${inputClass} mt-1`} inputMode="numeric" value={draft.minTuition} placeholder={t.promo.thresholdHint} onChange={(event) => setDraft({ ...draft, minTuition: event.target.value.replace(/[^\d]/g, "") })} />
            </label>
            <p className="mt-3 text-sm">{t.promo.benefit}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(["percent", "amount", "sessions"] as const).map((benefit) => (
                <button
                  key={benefit}
                  type="button"
                  className={cn(
                    "h-9 rounded-xl px-3 text-xs font-semibold",
                    draft.benefit === benefit ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-white",
                  )}
                  onClick={() => setDraft({ ...draft, benefit })}
                >
                  {t.promo[benefit]}
                </button>
              ))}
            </div>
            <label className="mt-2 block text-sm">{t.promo[draft.benefit]}
              <input className={`${inputClass} mt-1`} inputMode="numeric" value={draft.benefitValue} onChange={(event) => setDraft({ ...draft, benefitValue: event.target.value.replace(/[^\d]/g, "") })} />
            </label>
            <p className="mt-3 text-sm">{t.promo.codeMode}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(["none", "or", "and"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "h-9 rounded-xl px-3 text-xs font-semibold",
                    draft.codeMode === mode ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-white",
                  )}
                  onClick={() => setDraft({ ...draft, codeMode: mode })}
                >
                  {mode === "none" ? t.promo.codeNone : mode === "or" ? t.promo.codeOr : t.promo.codeAnd}
                </button>
              ))}
            </div>
            {draft.codeMode !== "none" ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">{draft.codeMode === "and" ? t.promo.codeAndHint : t.promo.codeOrHint}</p>
                {draft.codes.map((code, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                    <input className={inputClass} placeholder={t.promo.code} value={code.code} onChange={(event) => {
                      const codes = draft.codes.slice();
                      codes[index] = { ...code, code: event.target.value.toUpperCase() };
                      setDraft({ ...draft, codes });
                    }} />
                    <input className={inputClass} inputMode="numeric" placeholder={t.promo.maxUses} value={code.maxUses} onChange={(event) => {
                      const codes = draft.codes.slice();
                      codes[index] = { ...code, maxUses: event.target.value.replace(/[^\d]/g, "") };
                      setDraft({ ...draft, codes });
                    }} />
                  </div>
                ))}
                <button type="button" className="text-sm font-semibold text-[var(--brand-600)]" onClick={() => setDraft({ ...draft, codes: [...draft.codes, { code: "", maxUses: "" }] })}>
                  {t.promo.addCode}
                </button>
              </div>
            ) : null}
            <label className="mt-3 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.oncePerStudent} onChange={(event) => setDraft({ ...draft, oncePerStudent: event.target.checked })} />
              {t.promo.once}
            </label>
            <label className="mt-1 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
              {t.promo.active}
            </label>
            <label className="mt-2 block text-sm">{t.promo.note}
              <textarea className={`${inputClass} mt-1 min-h-20`} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </label>
            {preview ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{preview}</p> : null}
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-4 flex gap-2 pb-6">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDraft(null)}>{t.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={busy}>{t.promo.save}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
