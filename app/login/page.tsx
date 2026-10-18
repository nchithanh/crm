"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
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

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function runningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export default function LoginPage() {
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [hideInstall, setHideInstall] = useState(false);
  const { lang, t } = useI18n();
  const [vertical, setVertical] = useState<VerticalId>("nhay");
  useEffect(() => {
    const stored = getStoredVertical();
    if (stored) setVertical(stored);
    if (runningAsApp()) setHideInstall(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setHideInstall(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const option = VERTICALS.find((v) => v.id === vertical) ?? VERTICALS[0];
  const demo = demos[option.id];

  return (
    <main className={`mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-[var(--background)] px-4 py-8 ${hideInstall ? "" : "pb-28"}`}>
      <div className="crm-card-elev rounded-3xl px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-50)]">
            <BrandMark className="h-10 w-10" />
          </span>
          <h1 className="crm-page-title mt-4">{t.brand}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{fill(t.login.hint, { name: option.label })}</p>
        </div>

        <form
          className="mt-8 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await loginWithPin(pin);
              router.replace("/overview");
            } catch (err) {
              const message = err instanceof Error ? err.message : "";
              setError(message === "bad-pin" ? t.login.badPin : t.login.fail);
            }
          }}
        >
          <label className="block min-w-0 text-sm">
            <span className="text-slate-500">{t.login.pinLabel}</span>
            <span className="relative mt-1 block">
              <Lock size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className={`${inputClass} pl-9 tracking-[0.2em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder={t.login.pinPlaceholder}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoFocus
            />
            </span>
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
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3.5 text-left transition hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)]"
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

      </div>

      {hideInstall ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (!installPrompt) {
                  setGuideOpen(true);
                  return;
                }
                void installPrompt.prompt().then(() => installPrompt.userChoice).then((choice) => {
                  setInstallPrompt(null);
                  if (choice.outcome === "accepted") setHideInstall(true);
                }).catch(() => setGuideOpen(true));
              }}
            >
              {t.login.downloadApp}
            </Button>
          </div>
        </div>
      )}

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
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--card)] sm:mx-4 sm:rounded-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <h2 id="download-guide-title" className="text-sm font-bold text-slate-900">
                {t.login.downloadGuideTitle}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
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
                className="h-auto w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
