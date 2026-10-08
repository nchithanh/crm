"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import anhDemo from "@/data/anh/demo-accounts.json";
import boiDemo from "@/data/boi/demo-accounts.json";
import nhacDemo from "@/data/nhac/demo-accounts.json";
import nhayDemo from "@/data/nhay/demo-accounts.json";
import { BrandMark } from "@/components/brand-mark";
import { Button, inputClass } from "@/components/ui";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { getStoredVertical, VERTICALS, type VerticalId } from "@/lib/vertical";
import { useAuthStore } from "@/stores/auth-store";

const demos: Record<VerticalId, typeof nhayDemo> = {
  nhay: nhayDemo,
  anh: anhDemo,
  nhac: nhacDemo,
  boi: boiDemo,
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const guideSrc = `${basePath}/brand/download-app-guide.jpg`;

export default function LoginPage() {
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const { lang, t } = useI18n();
  const [vertical, setVertical] = useState<VerticalId>("nhay");
  useEffect(() => {
    const stored = getStoredVertical();
    if (stored) setVertical(stored);
  }, []);
  const option = VERTICALS.find((v) => v.id === vertical) ?? VERTICALS[0];
  const demo = demos[option.id];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-[12px] border border-[#E2E8F0] bg-white px-5 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:px-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="h-14 w-14" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{t.brand}</h1>
          <p className="mt-1.5 text-sm text-slate-700">{fill(t.login.hint, { name: option.label })}</p>
        </div>

        <form
          className="mt-8 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await loginWithPin(pin);
              router.replace("/");
            } catch (err) {
              const message = err instanceof Error ? err.message : "";
              setError(message === "bad-pin" ? t.login.badPin : t.login.fail);
            }
          }}
        >
          <label className="block min-w-0 text-sm">
            <span className="text-slate-500">{t.login.pinLabel}</span>
            <input
              className={`${inputClass} mt-1 tracking-[0.2em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder={t.login.pinPlaceholder}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoFocus
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button className="w-full" type="submit">
            {t.login.enter}
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {t.login.demoHeading}
          </p>
          <ul className="mt-3 space-y-2">
            {demo.map((a) => (
              <li key={a.pin}>
                <button
                  type="button"
                  onClick={() => {
                    setPin(a.pin);
                    setError("");
                  }}
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 text-left transition hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)]"
                >
                  <span className="truncate text-sm font-medium text-slate-800">
                    {roleLabel(a.role, lang)}
                    <span className="font-normal text-slate-400"> · {a.name}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-slate-400">PIN {a.pin}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm font-semibold text-[var(--brand-500)]"
          onClick={() => router.push("/choose-vertical")}
        >
          {t.login.switch}
        </button>

        <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setGuideOpen(true)}>
          {t.login.downloadApp}
        </Button>
      </div>

      {guideOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label={t.common.close}
            onClick={() => setGuideOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-guide-title"
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[12px] bg-white shadow-xl sm:mx-4 sm:rounded-[12px]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
              <h2 id="download-guide-title" className="text-sm font-bold text-slate-900">
                {t.login.downloadGuideTitle}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100"
                aria-label={t.common.close}
                onClick={() => setGuideOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <img
                src={guideSrc}
                alt={t.login.downloadGuideAlt}
                className="h-auto w-full rounded-[10px]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
