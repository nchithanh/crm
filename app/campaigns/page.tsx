"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Facebook, Instagram, Link2, Music2, Pause, Play, Radio } from "lucide-react";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { canManagePromotions } from "@/lib/access";
import { createSocialPost, setSocialPostStatus } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  SOCIAL_CHANNELS,
  channelLabel,
  conversionRate,
  publicJoinUrl,
} from "@/lib/social-cta";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { SocialChannel, SocialPost } from "@/types";

function channelTone(channel: SocialChannel): string {
  switch (channel) {
    case "tiktok":
      return "bg-slate-100 text-slate-700";
    case "facebook":
      return "bg-sky-100 text-sky-700";
    case "zalo":
      return "bg-blue-100 text-blue-700";
    case "instagram":
      return "bg-fuchsia-100 text-fuchsia-700";
    default:
      return "bg-[var(--brand-50)] text-[var(--brand-600)]";
  }
}

function ChannelIcon({ channel }: { channel: SocialChannel }) {
  const cls = "size-[1.1em]";
  switch (channel) {
    case "tiktok":
      return <Music2 className={cls} aria-hidden />;
    case "facebook":
      return <Facebook className={cls} aria-hidden />;
    case "zalo":
      return <Radio className={cls} aria-hidden />;
    case "instagram":
      return <Instagram className={cls} aria-hidden />;
    default:
      return <Link2 className={cls} aria-hidden />;
  }
}

export default function CampaignsPage() {
  const { lang, t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManagePromotions(role);
  const posts = useLiveQuery(() => db.socialPosts.orderBy("createdDay").reverse().toArray(), []) ?? [];
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<SocialChannel>("tiktok");
  const [externalUrl, setExternalUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const createClose = useOverlayClose(() => setCreating(false));

  const sorted = useMemo(
    () => [...posts].sort((a, b) => b.createdDay.localeCompare(a.createdDay) || b.id.localeCompare(a.id)),
    [posts],
  );

  async function onCreate() {
    if (!manage || busy) return;
    setBusy(true);
    try {
      const row = await createSocialPost({ title, channel, externalUrl, headline, subhead, note });
      if (!row) return;
      const url = publicJoinUrl(row.slug);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(row.id);
        window.setTimeout(() => setCopied(""), 2000);
      } catch {
        /* ignore */
      }
      setCreating(false);
      setTitle("");
      setExternalUrl("");
      setHeadline("");
      setSubhead("");
      setNote("");
      setChannel("tiktok");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(post: SocialPost, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    const url = publicJoinUrl(post.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(post.id);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.campaigns.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{t.campaigns.lead}</p>
        </div>
        {manage ? (
          <Button type="button" onClick={() => setCreating(true)}>
            {t.campaigns.create}
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="crm-card-elev rounded-[14px] p-6 text-sm text-slate-500">{t.campaigns.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((post) => {
            const rate = conversionRate(post.clickCount, post.leadCount);
            const paused = post.status === "paused";
            return (
              <li key={post.id}>
                <article
                  className={cn(
                    "crm-card-elev flex h-full flex-col p-2.5 transition hover:-translate-y-px sm:p-3",
                    paused && "opacity-80",
                  )}
                >
                  <Link href={`/campaigns/${post.id}`} className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={cn(
                          "crm-kpi-tile inline-flex shrink-0 items-center justify-center rounded-lg",
                          channelTone(post.channel),
                        )}
                      >
                        <ChannelIcon channel={post.channel} />
                      </span>
                      {paused ? <Badge tone="neutral">{t.campaigns.paused}</Badge> : null}
                    </div>
                    <p className="crm-kpi-label mt-1 truncate text-slate-500">{channelLabel(post.channel, lang)}</p>
                    <p className="crm-kpi-title mt-0.5 line-clamp-2 text-[var(--foreground)]">{post.title}</p>
                    <p className="crm-kpi-hint mt-0.5 truncate font-mono text-slate-400">/r/{post.slug}</p>

                    <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-[var(--border)] pt-2">
                      <div>
                        <p className="crm-kpi-value text-[var(--foreground)]">{post.clickCount.toLocaleString(lang)}</p>
                        <p className="crm-kpi-hint mt-0.5 truncate text-slate-400">{t.campaigns.clicks}</p>
                      </div>
                      <div>
                        <p className="crm-kpi-value text-[var(--brand-600)]">{post.leadCount.toLocaleString(lang)}</p>
                        <p className="crm-kpi-hint mt-0.5 truncate text-slate-400">{t.campaigns.leads}</p>
                      </div>
                      <div>
                        <p className="crm-kpi-value text-[var(--brand-600)]">{rate}</p>
                        <p className="crm-kpi-hint mt-0.5 truncate text-slate-400">{t.campaigns.rate}</p>
                      </div>
                    </div>
                  </Link>

                  <div className="mt-2 flex items-center gap-1 border-t border-[var(--border)] pt-2">
                    <button
                      type="button"
                      className="crm-kpi-label inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-white font-semibold text-[var(--brand-600)] hover:bg-[var(--brand-50)]"
                      onClick={(e) => void copyUrl(post, e)}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      {copied === post.id ? t.campaigns.copied : t.campaigns.copyLink}
                    </button>
                    {manage ? (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                        aria-label={paused ? t.campaigns.resume : t.campaigns.pause}
                        onClick={() => void setSocialPostStatus(post.id, paused ? "active" : "paused")}
                      >
                        {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <CrmDrawerShell leaving={createClose.leaving} onClose={createClose.requestClose} closeLabel={t.common.close}>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-base font-semibold">{t.campaigns.createTitle}</h2>
            <Button type="button" variant="ghost" onClick={createClose.requestClose}>
              {t.common.close}
            </Button>
          </div>
          <div className="space-y-3 overflow-y-auto p-4">
            <Field label={t.campaigns.name}>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.campaigns.namePh} />
            </Field>
            <Field label={t.campaigns.channel}>
              <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value as SocialChannel)}>
                {SOCIAL_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {channelLabel(c, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.campaigns.externalUrl}>
              <input className={inputClass} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
            </Field>
            <Field label={t.campaigns.headline}>
              <input className={inputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </Field>
            <Field label={t.campaigns.subhead}>
              <input className={inputClass} value={subhead} onChange={(e) => setSubhead(e.target.value)} />
            </Field>
            <Field label={t.campaigns.note}>
              <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button type="button" disabled={busy || !title.trim()} onClick={() => void onCreate()}>
              {t.campaigns.save}
            </Button>
            {copied ? <p className="text-sm text-emerald-600">{t.campaigns.copied}</p> : null}
            <p className="text-xs text-slate-500">{fill(t.campaigns.chipFrom, { channel: channelLabel(channel, lang) })}</p>
          </div>
        </CrmDrawerShell>
      ) : null}
    </div>
  );
}
