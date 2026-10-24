"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { LogOut } from "lucide-react";
import { SupportIcon } from "@/components/support-icon";
import { ProfileSheet } from "@/components/profile-sheet";
import { canSeeNavHref, isMaStudioMode } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NAV_AI, NAV_GROUPS, NAV_MA_STAFF, NAV_SYSTEM, NAV_TOP, ZALO_FOUNDER, type NavItem } from "@/lib/nav";
import { useAccessStore } from "@/stores/access-store";
import { navBadgeClassLight, navBadgeKind, useNavBadges } from "@/lib/nav-badges";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

type Tab = "main" | "support";

function Tile({
  item,
  badge,
}: {
  item: { href: string; key: keyof typeof import("@/lib/copy").copy.vi.nav; icon: NavItem["icon"] };
  badge?: number;
}) {
  const Icon = item.icon;
  const { t } = useI18n();
  return (
    <Link href={item.href} className="group flex min-w-0 flex-col items-center gap-2">
      <span className="crm-icon-tile relative h-12 w-12 rounded-2xl transition group-hover:bg-[var(--brand-100)]">
        <Icon size={22} strokeWidth={1.75} />
        {(badge ?? 0) > 0 ? (
          <span
            className={cn(
              "absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 tabular-nums",
              navBadgeClassLight(navBadgeKind(item.href)),
            )}
          >
            {badge! > 99 ? "99" : badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full text-center text-xs leading-tight font-medium text-[var(--foreground)]">
        {t.nav[item.key]}
      </span>
    </Link>
  );
}

export default function MenuPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const { branchId, setBranchId } = useStudioBranch();
  const navBadges = useNavBadges();
  const { lang, t } = useI18n();
  const [tab, setTab] = useState<Tab>("main");
  const [profileOpen, setProfileOpen] = useState(false);

  const accessRev = useAccessStore((s) => s.revision);
  const maMode = isMaStudioMode();
  const topItems = NAV_TOP.filter((item) => canSeeNavHref(user?.role, item.href));
  const groups = [...NAV_GROUPS, NAV_SYSTEM].map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavHref(user?.role, item.href)),
  })).filter((group) => group.items.length > 0);
  const showAi = !maMode && canSeeNavHref(user?.role, NAV_AI.href);
  void accessRev;

  if (maMode) {
    const taskItem = groups.flatMap((g) => g.items).find((i) => i.href === "/tasks")
      ?? NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === "/tasks");
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        {user ? (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="crm-card-elev flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--brand-50)]"
            aria-label={t.common.editProfile}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ background: user.avatarColor || "var(--brand-500)" }}
              aria-hidden
            >
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold text-[var(--foreground)]">{user.name}</span>
              <span className="block truncate text-xs text-[var(--muted)]">
                {roleLabel(user.role, lang)} · Ma Dance Studio
              </span>
            </span>
          </button>
        ) : null}
        {taskItem || canSeeNavHref(user?.role, NAV_MA_STAFF.href) ? (
          <section className="crm-card-elev p-4" aria-label={t.nav.tasks}>
            <h2 className="crm-section-title">{t.nav.menu}</h2>
            <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
              {taskItem ? <Tile item={taskItem} badge={navBadges[taskItem.href]} /> : null}
              {canSeeNavHref(user?.role, NAV_MA_STAFF.href) ? (
                <Tile item={NAV_MA_STAFF} badge={navBadges[NAV_MA_STAFF.href]} />
              ) : null}
            </div>
          </section>
        ) : null}
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="crm-card-elev flex items-center gap-3 px-4 py-3 text-left hover:bg-rose-50"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <LogOut size={20} strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-rose-600">{t.common.logout}</span>
        </button>
        <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      {user ? (
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="crm-card-elev flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--brand-50)]"
          aria-label={t.common.editProfile}
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ background: user.avatarColor || "var(--brand-500)" }}
            aria-hidden
          >
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-[var(--foreground)]">{user.name}</span>
            <span className="block truncate text-xs text-[var(--muted)]">
              {roleLabel(user.role, lang)} · {settings?.name || "Edu Dance"}
            </span>
          </span>
        </button>
      ) : null}

      <div className="crm-card-elev p-3">
        <label className="block min-w-0">
          <span className="crm-meta">{t.common.branch}</span>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-normal text-[var(--foreground)]"
            aria-label={t.common.branch}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="all">{t.common.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Menu" className="crm-card-elev flex p-1">
        {(["main", "support"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "h-10 flex-1 rounded-xl text-sm font-semibold transition",
              tab === id ? "bg-[var(--brand-500)] text-white crm-btn-elev" : "text-[var(--muted)] hover:bg-[var(--brand-50)]",
            )}
          >
            {id === "main" ? t.nav.manage : t.nav.support}
          </button>
        ))}
      </div>

      {tab === "main" ? (
        <div className="crm-tab-panel flex flex-col gap-3">
          {topItems.length > 0 ? (
            <section className="crm-card-elev p-4" aria-label={t.nav.overview}>
              <h2 className="crm-section-title">{t.nav.overview}</h2>
              <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
                {topItems.map((item) => (
                  <Tile key={item.href} item={item} badge={navBadges[item.href]} />
                ))}
              </div>
            </section>
          ) : null}
          {groups.map((group) => (
            <section key={group.title} className="crm-card-elev p-4" aria-label={t.nav[group.title]}>
              <h2 className="crm-section-title">{t.nav[group.title]}</h2>
              <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
                {group.items.map((item) => (
                  <Tile key={item.href} item={item} badge={navBadges[item.href]} />
                ))}
              </div>
            </section>
          ))}
          {showAi ? (
            <section className="crm-card-elev p-4" aria-label={t.nav.ai}>
              <h2 className="crm-section-title">{t.nav.ai}</h2>
              <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
                <Tile item={NAV_AI} />
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="crm-tab-panel flex flex-col gap-3">
          <section className="crm-card-elev p-4" aria-label={t.nav.support}>
            <h2 className="crm-section-title">{t.nav.support}</h2>
            <div className="mt-3 flex flex-col">
              <a
                href={ZALO_FOUNDER}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[var(--brand-50)]"
              >
                <span className="crm-icon-tile h-11 w-11">
                  <SupportIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">{t.nav.support}</span>
                  <span className="block text-xs text-[var(--muted)]">Zalo</span>
                </span>
              </a>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="flex items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-rose-50"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <LogOut size={20} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-semibold text-rose-600">{t.common.logout}</span>
              </button>
            </div>
          </section>
        </div>
      )}
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
