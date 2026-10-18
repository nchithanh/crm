"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { sepayQrUrl } from "@/lib/payment-accounts";
import { shareTransferNotice } from "@/lib/share-transfer";
import { formatVnd } from "@/lib/utils";
import type { PaymentAccount } from "@/types";

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
  account,
  memo,
}: {
  amount: number;
  studentName?: string;
  studentPhone?: string;
  studio?: string;
  account?: PaymentAccount | null;
  memo?: string;
}) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState("");
  const payload = account && memo ? sepayQrUrl(account, amount, memo) : transferQrPayload(amount, studentName);
  const label = `${t.money.transferTitle} ${formatVnd(amount)}`;
  const accountLine = account
    ? fill(t.money.qrAccount, { bank: account.bank, number: account.accountNumber, holder: account.accountHolder })
    : "";
  const shareText = [
    studio || t.brand,
    studentName ? `${t.finance.student}: ${studentName}` : null,
    label,
    accountLine || null,
    memo || null,
    account ? payload : payload,
    account ? t.money.qrSepayNote : t.money.qrDemoNote,
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    if (account) {
      setDataUrl("");
      return;
    }
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
  }, [account, payload]);

  const share = async () => {
    const imageUrl = account ? payload : dataUrl;
    await shareTransferNotice({
      title: t.money.transferTitle,
      text: shareText,
      imageUrl: imageUrl || undefined,
    });
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
    <div className="mt-3 flex flex-col items-center rounded-xl border border-slate-200 p-4">
      {account ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payload}
          alt={`${t.money.transferTitle} ${formatVnd(amount)} ${account.bank}`}
          width={220}
          height={220}
          className="rounded-xl"
        />
      ) : dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`${t.money.transferTitle} ${formatVnd(amount)}`}
          width={220}
          height={220}
          className="rounded-xl"
        />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-slate-100" />
      )}
      <p className="mt-3 text-sm text-slate-500">{t.money.transferAmount}</p>
      <p className="text-xl font-bold tabular-nums">{formatVnd(amount)}</p>
      {accountLine ? <p className="mt-1 text-center text-sm text-[var(--foreground)]">{accountLine}</p> : null}
      <p className="mt-1 text-center text-xs text-slate-400">{account ? t.money.qrSepayNote : t.money.qrDemoNote}</p>
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
