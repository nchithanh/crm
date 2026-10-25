"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserRound, X } from "lucide-react";
import anhDemo from "@/data/anh/demo-accounts.json";
import boiDemo from "@/data/boi/demo-accounts.json";
import massageDemo from "@/data/massage/demo-accounts.json";
import nailsDemo from "@/data/nails/demo-accounts.json";
import nhacDemo from "@/data/nhac/demo-accounts.json";
import nhayDemo from "@/data/nhay/demo-accounts.json";
import salonDemo from "@/data/salon/demo-accounts.json";
import spaDemo from "@/data/spa/demo-accounts.json";
import { BrandMark } from "@/components/brand-mark";
import { Button, inputClass } from "@/components/ui";
import { getStoredAuthMode, setStoredAuthMode } from "@/lib/auth-mode";
import { fill } from "@/lib/copy";
import { reopenDb } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { bootStudio } from "@/lib/seed";
import {
  clearStoredVertical,
  setStoredVertical,
  VERTICALS,
  type VerticalId,
} from "@/lib/vertical";
import { useAuthStore } from "@/stores/auth-store";

const demos: Record<VerticalId, typeof nhayDemo> = {
  nhay: nhayDemo,
  anh: anhDemo,
  nhac: nhacDemo,
  boi: boiDemo,
  spa: spaDemo,
  nails: nailsDemo,
  salon: salonDemo,
  massage: massageDemo,
};

type ChooseBlurb = "dance" | "english" | "music" | "swim" | "spa" | "nails" | "salon" | "massage";

const blurbs: Record<VerticalId, ChooseBlurb> = {
  nhay: "dance",
  anh: "english",
  nhac: "music",
  boi: "swim",
  spa: "spa",
  nails: "nails",
  salon: "salon",
  massage: "massage",
};

const LOAD_MS = 1000;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const guideSrc = `${basePath}/brand/download-app-guide.jpg`;
const maLogoSrc = `${basePath}/brand/ma-dance-studio.jpg`;

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Step = "pick" | "loading" | "pin" | "ma-login";

function runningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function DolphinCircleLoader({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={title}
    >
      <div className="relative h-28 w-28">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden>
          <circle className="crm-login-ring-track" cx="48" cy="48" r="40" fill="none" strokeWidth="5" />
          <circle className="crm-login-ring" cx="48" cy="48" r="40" fill="none" strokeWidth="5" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--brand-50)]">
          <BrandMark className="h-12 w-12" />
        </span>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const loginWithMaCredentials = useAuthStore((s) => s.loginWithMaCredentials);
  const [step, setStep] = useState<Step>("pick");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [hideInstall, setHideInstall] = useState(false);
  const { lang, t } = useI18n();
  const [vertical, setVertical] = useState<VerticalId | null>(null);

  useEffect(() => {
    if (getStoredAuthMode() === "ma") setStep("ma-login");
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (step !== "loading" || !vertical) return;
    let cancelled = false;
    const started = Date.now();
    void (async () => {
      try {
        await bootStudio(vertical);
      } catch {
        /* pin form vẫn mở — login sẽ báo lỗi nếu DB chưa sẵn */
      }
      const wait = Math.max(0, LOAD_MS - (Date.now() - started));
      window.setTimeout(() => {
        if (!cancelled) setStep("pin");
      }, wait);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, vertical]);

  const option = vertical ? VERTICALS.find((v) => v.id === vertical) ?? VERTICALS[0] : null;
  const demo = option ? demos[option.id] : [];

  function pickVertical(id: VerticalId) {
    setStoredAuthMode("demo");
    setStoredVertical(id);
    reopenDb(id);
    setVertical(id);
    setPin("");
    setError("");
    setStep("loading");
  }

  function pickMa() {
    setStoredAuthMode("ma");
    clearStoredVertical();
    setVertical(null);
    setUsername("");
    setPassword("");
    setError("");
    setStep("ma-login");
  }

  function backToPick() {
    setStep("pick");
    setPin("");
    setUsername("");
    setPassword("");
    setError("");
  }

  if (step === "pick") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center bg-[var(--background)] px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-3 h-14 w-14" />
          <p className="text-sm font-semibold text-[var(--brand-600)]">{t.brand}</p>
          <h1 className="crm-page-title mt-1">{t.choose.title}</h1>
          <p className="crm-lead mt-2 max-w-md">{t.choose.lead}</p>
        </div>
        <ul className="flex w-full flex-col gap-3">
          <li>
            <button
              type="button"
              className="crm-card-elev flex w-full items-center gap-3 border-[var(--brand-300)] px-4 py-3.5 text-left transition hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)]"
              onClick={pickMa}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--border)]">
                <img
                  src={maLogoSrc}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-slate-900">{t.choose.maLabel}</span>
                <span className="mt-0.5 block text-sm text-slate-700">{t.choose.ma}</span>
              </span>
            </button>
          </li>
          {VERTICALS.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="crm-card-elev flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)]"
                onClick={() => pickVertical(v.id)}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: v.soft }}
                  aria-hidden
                >
                  {v.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-slate-900">{v.label}</span>
                  <span className="mt-0.5 block text-sm text-slate-700">{t.choose[blurbs[v.id]]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (step === "loading") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-[var(--background)] px-4">
        <DolphinCircleLoader title={t.login.loading} hint={option?.label ?? t.login.loadingHint} />
      </main>
    );
  }

  if (step === "ma-login") {
    return (
      <main
        className={`mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-[var(--background)] px-4 py-8 ${hideInstall ? "" : "pb-28"}`}
      >
        <div className="crm-card-elev rounded-3xl px-5 py-8 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <img
              src={maLogoSrc}
              alt="MA Dance Studio"
              width={200}
              height={200}
              className="h-auto w-[min(11rem,55vw)] object-contain"
            />
            <h1 className="crm-page-title mt-5">{t.login.maTitle}</h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">{t.login.maHint}</p>
          </div>

          <form
            className="mt-8 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (signingIn) return;
              setError("");
              setSigningIn(true);
              try {
                await loginWithMaCredentials(username, password);
                router.replace("/tasks");
              } catch (err) {
                const message = err instanceof Error ? err.message : "";
                if (message === "bad-credentials") setError(t.login.badCredentials);
                else if (message === "network") setError(t.login.networkFail);
                else setError(t.login.fail);
              } finally {
                setSigningIn(false);
              }
            }}
          >
            <label className="block min-w-0 text-sm">
              <span className="text-slate-500">{t.login.usernameLabel}</span>
              <span className="relative mt-1 block">
                <UserRound size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className={`${inputClass} pl-9`}
                  autoComplete="username"
                  placeholder={t.login.usernamePlaceholder}
                  value={username}
                  disabled={signingIn}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </span>
            </label>
            <label className="block min-w-0 text-sm">
              <span className="text-slate-500">{t.login.passwordLabel}</span>
              <span className="relative mt-1 block">
                <Lock size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className={`${inputClass} pl-9`}
                  type="password"
                  autoComplete="current-password"
                  placeholder={t.login.passwordPlaceholder}
                  value={password}
                  disabled={signingIn}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </span>
            </label>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button className="w-full" type="submit" busy={signingIn}>
              {signingIn ? t.common.working : t.login.enter}
            </Button>
          </form>

          <button
            type="button"
            className="mt-6 w-full text-center text-sm font-semibold text-[var(--brand-500)]"
            onClick={backToPick}
          >
            {t.login.switch}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-[var(--background)] px-4 py-8 ${hideInstall ? "" : "pb-28"}`}
    >
      <div className="crm-card-elev rounded-3xl px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-50)]">
            <BrandMark className="h-10 w-10" />
          </span>
          <h1 className="crm-page-title mt-4">{t.brand}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {fill(t.login.hint, { name: option?.label ?? t.brand })}
          </p>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{t.login.demoHeading}</p>
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
          onClick={backToPick}
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
                void installPrompt
                  .prompt()
                  .then(() => installPrompt.userChoice)
                  .then((choice) => {
                    setInstallPrompt(null);
                    if (choice.outcome === "accepted") setHideInstall(true);
                  })
                  .catch(() => setGuideOpen(true));
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
              <img src={guideSrc} alt={t.login.downloadGuideAlt} className="h-auto w-full rounded-xl" />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
