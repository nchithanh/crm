"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";
import { submitSocialLead, trackSocialClick, trackSocialFormView } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import type { SocialPost } from "@/types";

export default function PublicJoinPage() {
  const { t } = useI18n();
  const params = useParams();
  const slug = String(params.slug ?? "");
  const [post, setPost] = useState<SocialPost | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setPost(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const tracked = await trackSocialClick(slug);
      if (cancelled) return;
      if (!tracked) {
        const row = await db.socialPosts.where("slug").equals(slug).first();
        setPost(row ?? null);
        return;
      }
      setPost(tracked);
      await trackSocialFormView(slug);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitSocialLead({ slug, name, phone, email });
      if (!result.ok) {
        if (result.reason === "paused") setError(t.join.errPaused);
        else if (result.reason === "not_found") setError(t.join.errNotFound);
        else setError(t.join.errMissing);
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (post === undefined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">{t.join.loading}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">{t.join.errNotFound}</p>
      </main>
    );
  }

  if (post.status !== "active") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">{t.join.errPaused}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="crm-card-elev rounded-[16px] p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-600)]">Dolphin CRM</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--ink)]">{post.headline}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{post.subhead}</p>

        {done ? (
          <div className="mt-6 space-y-1">
            <p className="font-semibold text-emerald-700">{t.join.okTitle}</p>
            <p className="text-sm text-[var(--muted)]">{t.join.okBody}</p>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
            <Field label={t.join.name}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </Field>
            <Field label={t.join.phone}>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </Field>
            <Field label={t.join.email}>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t.join.sending : t.join.submit}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
