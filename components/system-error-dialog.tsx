"use client";

import { AlertTriangle, Headset, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";
import { CrmModalShell, useOverlayClose } from "@/components/crm-overlay";
import { useI18n } from "@/lib/i18n";
import { ZALO_FOUNDER } from "@/lib/nav";
import { useSystemErrorStore } from "@/stores/system-error-store";

export function SystemErrorDialog() {
  const { t } = useI18n();
  const open = useSystemErrorStore((s) => s.open);
  const payload = useSystemErrorStore((s) => s.payload);
  const clear = useSystemErrorStore((s) => s.clear);
  const { leaving, requestClose } = useOverlayClose(clear);

  if (!open || !payload) return null;

  const copy = t.systemError;
  const title =
    payload.kind === "server"
      ? copy.titleServer
      : payload.kind === "network"
        ? copy.titleNetwork
        : copy.titleClient;

  let body = "";
  if (payload.kind === "server") {
    body = copy.bodyServer;
  } else if (payload.kind === "network") {
    body = payload.message || copy.bodyNetwork;
  } else if (payload.message) {
    body = payload.message;
  } else if (payload.status === 403) {
    body = copy.fallback403;
  } else if (payload.status === 404) {
    body = copy.fallback404;
  } else if (payload.status === 422) {
    body = copy.fallback422;
  } else {
    body = copy.fallback4xx.replace("{status}", String(payload.status || "—"));
  }

  const Icon = payload.kind === "network" ? WifiOff : payload.kind === "server" ? Headset : AlertTriangle;
  const iconTone =
    payload.kind === "server"
      ? "bg-rose-50 text-rose-600"
      : payload.kind === "network"
        ? "bg-amber-50 text-amber-700"
        : "bg-[var(--brand-50)] text-[var(--brand-600)]";

  return (
    <div className="relative z-[80]">
      <CrmModalShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>
              <Icon size={22} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[var(--foreground)]">{title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{body}</p>
              {payload.kind === "client" && payload.status > 0 ? (
                <p className="mt-2 text-xs font-medium text-[var(--muted)]">HTTP {payload.status}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {payload.kind === "server" ? (
              <a
                href={ZALO_FOUNDER}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-xl bg-[var(--brand-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] active:opacity-90"
              >
                {copy.contactSupport}
              </a>
            ) : null}
            <Button type="button" variant={payload.kind === "server" ? "outline" : "primary"} onClick={requestClose}>
              {t.common.close}
            </Button>
          </div>
        </div>
      </CrmModalShell>
    </div>
  );
}
