"use client";

import { useEffect, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { CrmModalShell, useOverlayClose } from "@/components/crm-overlay";
import { shareTransferNotice } from "@/lib/share-transfer";
import { useI18n } from "@/lib/i18n";

export type SharePreviewInput = {
  title: string;
  text: string;
  phone?: string;
  imageUrl?: string;
};

export function SharePreviewDialog({
  open,
  draft,
  onClose,
  onDone,
}: {
  open: boolean;
  draft: SharePreviewInput | null;
  onClose: () => void;
  onDone?: (result: "shared" | "copied") => void;
}) {
  const { t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !draft) return;
    setText(draft.text);
    setNote("");
    setBusy(false);
  }, [open, draft]);

  if (!open || !draft) return null;

  async function confirmShare() {
    if (!draft || busy) return;
    setBusy(true);
    setNote("");
    const result = await shareTransferNotice({
      title: draft.title,
      text: text.trim() || draft.text,
      phone: draft.phone,
      imageUrl: draft.imageUrl,
    });
    setBusy(false);
    if (result === "aborted") return;
    setNote(result === "copied" ? t.care.shareCopied : t.care.shareOpened);
    onDone?.(result);
    window.setTimeout(() => requestClose(), 500);
  }

  return (
    <CrmModalShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close}>
      <h2 className="text-lg font-bold text-[var(--foreground)]">{t.care.sharePreviewTitle}</h2>
      <p className="mt-1 text-sm text-slate-500">{t.care.sharePreviewLead}</p>
      <div className="mt-3">
        <Field label={t.care.sharePreviewBody}>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t.care.sharePreviewBody}
          />
        </Field>
      </div>
      {note ? <p className="mt-2 text-sm text-green-800">{note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={requestClose} disabled={busy}>
          {t.common.close}
        </Button>
        <Button type="button" onClick={() => void confirmShare()} disabled={busy || !text.trim()}>
          {t.care.shareConfirm}
        </Button>
      </div>
    </CrmModalShell>
  );
}
