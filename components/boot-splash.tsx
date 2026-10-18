"use client";

import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/lib/i18n";

export function BootSplash({
  slow = false,
  onRetry,
  onLogin,
}: {
  slow?: boolean;
  onRetry?: () => void;
  onLogin?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="crm-boot flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--background)] px-6"
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={t.shell.product}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="relative inline-flex">
          <BrandMark className="h-14 w-14" />
          <span className="crm-boot__ring absolute -inset-2 rounded-full bg-[var(--brand-500)]/15" aria-hidden />
        </span>
        <p className="text-base font-semibold tracking-tight text-[var(--foreground)]">{t.shell.product}</p>
        <p className="text-sm text-slate-500">{slow ? t.shell.bootSlow : t.shell.booting}</p>
      </div>
      {slow ? (
        <div className="flex gap-2">
          <button type="button" className="h-10 rounded-xl bg-[var(--brand-500)] px-4 text-sm font-semibold text-white" onClick={onRetry}>
            {t.shell.bootRetry}
          </button>
          <button type="button" className="h-10 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold" onClick={onLogin}>
            {t.shell.bootLogin}
          </button>
        </div>
      ) : (
        <div className="h-1 w-36 overflow-hidden rounded-full bg-slate-200">
          <div className="crm-boot__bar h-full w-1/2 rounded-full bg-[var(--brand-500)]" />
        </div>
      )}
    </div>
  );
}
