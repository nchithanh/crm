"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";

/** Demo QR only — payload includes amount, not a live bank code. */
export function transferQrPayload(amount: number, studentName?: string) {
  const who = studentName ? `|${studentName}` : "";
  return `DOLPHIN-CRM|CK|${Math.max(0, Math.round(amount))}|VND${who}`;
}

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function TransferQr({
  amount,
  studentName,
  studentPhone,
  studio,
}: {
  amount: number;
  studentName?: string;
  studentPhone?: string;
  studio?: string;
}) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState("");
  const payload = transferQrPayload(amount, studentName);
  const label = `${t.money.transferTitle} ${formatVnd(amount)}`;
  const shareText = [
    studio || t.brand,
    studentName ? `${t.finance.student}: ${studentName}` : null,
    label,
    payload,
    t.money.qrDemoNote,
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(payload, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setDataUrl(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const share = async () => {
    try {
      if (dataUrl && typeof navigator.share === "function") {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "chuyen-khoan-hoc-phi.png", { type: "image/png" });
        const withFile = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
        if (withFile) {
          await navigator.share({ title: t.money.transferTitle, text: label, files: [file] });
          return;
        }
        await navigator.share({ title: t.money.transferTitle, text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        /* ignore */
      }
    }
  };

  const sendZalo = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      /* vẫn mở Zalo */
    }
    const digits = digitsOnly(studentPhone || "");
    const url = digits ? `https://zalo.me/${digits}` : "https://zalo.me/";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-3 flex flex-col items-center rounded-[10px] border border-slate-200 p-4">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`${t.money.transferTitle} ${formatVnd(amount)}`}
          width={220}
          height={220}
          className="rounded-[10px]"
        />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded-[10px] bg-slate-100" />
      )}
      <p className="mt-3 text-sm text-slate-500">{t.money.transferAmount}</p>
      <p className="text-xl font-bold tabular-nums">{formatVnd(amount)}</p>
      <p className="mt-1 text-center text-xs text-slate-400">{t.money.qrDemoNote}</p>
      <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1" onClick={() => void share()} disabled={amount <= 0}>
          <Share2 size={16} /> {t.money.share}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => void sendZalo()} disabled={amount <= 0}>
          {t.money.sendZalo}
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">{t.money.zaloHint}</p>
    </div>
  );
}
