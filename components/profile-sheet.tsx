"use client";

import { useEffect, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { CrmModalShell, useOverlayClose } from "@/components/crm-overlay";
import { isMaStudioMode } from "@/lib/access";
import { updateMyProfile } from "@/lib/api/crm-profile";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";

const HARDCODE_PHONE = "0900000000";

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { leaving, requestClose } = useOverlayClose(onClose);
  const maMode = isMaStudioMode();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setPhone(user.phone?.trim() || (maMode ? "" : HARDCODE_PHONE));
    setEmail(user.email?.trim() || "");
    setSaved(false);
    setError("");
  }, [open, user, maMode]);

  if (!open || !user) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (maMode) {
        const updated = await updateMyProfile({ name, phone });
        updateProfile({
          name: updated.name,
          phone: updated.phone,
          email: user?.email ?? email,
          avatarColor: updated.avatarColor,
        });
      } else {
        updateProfile({ name, phone, email });
      }
      setSaved(true);
      window.setTimeout(() => requestClose(), 400);
    } catch {
      setError(t.profile.fail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CrmModalShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ background: user.avatarColor || "var(--brand-500)" }}
          aria-hidden
        >
          {(name || user.name).trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--foreground)]">{t.profile.title}</h2>
          <p className="truncate text-xs text-slate-500">{roleLabel(user.role, lang)}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">{maMode ? t.profile.subtitleApi : t.profile.subtitle}</p>

      <form className="mt-4 space-y-3" onSubmit={(e) => void onSave(e)}>
        <Field label={t.profile.name}>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label={t.profile.phone}>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
        <Field label={t.profile.email}>
          <input className={inputClass} type="email" value={email} disabled={maMode} readOnly={maMode} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t.profile.role}>
          <input className={inputClass} value={roleLabel(user.role, lang)} disabled readOnly />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {saved ? <p className="text-sm text-green-700">{t.profile.saved}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" busy={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={requestClose}>
            {t.common.close}
          </Button>
        </div>
      </form>
    </CrmModalShell>
  );
}
