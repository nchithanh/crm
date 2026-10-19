import type { SocialChannel } from "@/types";

export const SOCIAL_CHANNELS: SocialChannel[] = ["tiktok", "facebook", "zalo", "instagram", "other"];

export function channelLabel(channel: SocialChannel, lang: "vi" | "en"): string {
  const vi: Record<SocialChannel, string> = {
    tiktok: "TikTok",
    facebook: "Facebook",
    zalo: "Zalo",
    instagram: "Instagram",
    other: "Khác",
  };
  const en: Record<SocialChannel, string> = {
    tiktok: "TikTok",
    facebook: "Facebook",
    zalo: "Zalo",
    instagram: "Instagram",
    other: "Other",
  };
  return (lang === "vi" ? vi : en)[channel];
}

export function sourceLabel(channel: SocialChannel, postTitle: string): string {
  return `${channelLabel(channel, "vi")} · ${postTitle}`;
}

/** Slug ngắn 6 ký tự [a-z0-9]. */
export function makeLinkSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function publicJoinPath(slug: string): string {
  return `/r/${slug}`;
}

export function publicJoinUrl(slug: string): string {
  if (typeof window === "undefined") return publicJoinPath(slug);
  return `${window.location.origin}${publicJoinPath(slug)}`;
}

export function conversionRate(clicks: number, leads: number): string {
  if (clicks <= 0) return "—";
  return `${((leads / clicks) * 100).toFixed(1)}%`;
}
