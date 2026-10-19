"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button } from "@/components/ui";
import { canManagePromotions } from "@/lib/access";
import { setSocialPostStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { leadStageLabel, leadStageTone } from "@/lib/labels";
import { channelLabel, conversionRate, publicJoinUrl } from "@/lib/social-cta";
import { useAuthStore } from "@/stores/auth-store";

export default function CampaignDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams();
  const id = String(params.id ?? "");
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManagePromotions(role);
  const post = useLiveQuery(() => (id ? db.socialPosts.get(id) : undefined), [id]);
  const leads = useLiveQuery(() => (id ? db.leads.where("postId").equals(id).toArray() : []), [id]) ?? [];
  const [copied, setCopied] = useState(false);

  if (post === undefined) {
    return <p className="text-sm text-[var(--muted)]">…</p>;
  }
  if (!post) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">{t.campaigns.empty}</p>
        <Link href="/campaigns" className="text-sm font-medium text-[var(--brand-600)] hover:underline">
          ← {t.campaigns.title}
        </Link>
      </div>
    );
  }

  async function copyUrl() {
    if (!post) return;
    try {
      await navigator.clipboard.writeText(publicJoinUrl(post.slug));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/campaigns" className="text-xs font-medium text-[var(--brand-600)] hover:underline">
            ← {t.campaigns.title}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-[var(--ink)]">{post.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={post.status === "active" ? "ok" : "neutral"}>
              {post.status === "active" ? t.campaigns.active : t.campaigns.paused}
            </Badge>
            <Badge tone="info">{channelLabel(post.channel, lang)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copyUrl()}>
            {copied ? t.campaigns.copied : t.campaigns.copyLink}
          </Button>
          {manage ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void setSocialPostStatus(post.id, post.status === "active" ? "paused" : "active")}
            >
              {post.status === "active" ? t.campaigns.pause : t.campaigns.resume}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="crm-card-elev grid gap-3 rounded-[14px] p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--muted)]">{t.campaigns.clicks}</p>
          <p className="text-lg font-semibold">{post.clickCount}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">{t.campaigns.leads}</p>
          <p className="text-lg font-semibold">{post.leadCount}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">{t.campaigns.rate}</p>
          <p className="text-lg font-semibold">{conversionRate(post.clickCount, post.leadCount)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">{t.campaigns.joinUrl}</p>
          <p className="truncate text-sm font-medium">/r/{post.slug}</p>
        </div>
      </div>

      {post.note ? <p className="text-sm text-[var(--muted)]">{post.note}</p> : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">{t.campaigns.attributed}</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t.campaigns.noLeads}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-white">
            {leads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <Link href={`/follow-up?lead=${lead.id}`} className="font-medium text-[var(--ink)] hover:underline">
                    {lead.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {lead.phone}
                    {lead.email ? ` · ${lead.email}` : ""}
                  </p>
                </div>
                <Badge tone={leadStageTone(lead.stage)}>{leadStageLabel(lead.stage, lang)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
