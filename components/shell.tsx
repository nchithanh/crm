"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  ClipboardCheck,
  HeartHandshake,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  LogOut,
  Receipt,
  Search,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AppBreadcrumb } from "@/components/breadcrumb";
import { BrandMark } from "@/components/brand-mark";
import { CommandPalette } from "@/components/command-palette";
import { SupportIcon } from "@/components/support-icon";
import { canAccessPath, canCollect, canSeeMoney, canSeeNavHref, homePathForRole } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaOutline, ctaPrimary } from "@/components/ui";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { NAV_AI, NAV_GROUPS, NAV_SYSTEM, NAV_TOP, ZALO_FOUNDER } from "@/lib/nav";
import { navBadgeClassDark, navBadgeClassLight, navBadgeKind, useNavBadges } from "@/lib/nav-badges";
import { useAccessStore } from "@/stores/access-store";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Role } from "@/types";

type MobileItem = {
  href: string;
  key: "overview" | "students" | "attendShort" | "enrollTab" | "tasks" | "menu" | "care";
  icon: typeof LayoutDashboard;
};

function mobileForRole(role: Role | undefined): MobileItem[] {
  if (role === "teacher") {
    return [
      { href: "/overview", key: "overview", icon: LayoutDashboard },
      { href: "/students", key: "students", icon: Users },
      { href: "/attendance", key: "attendShort", icon: ClipboardCheck },
      { href: "/tasks", key: "tasks", icon: ListTodo },
      { href: "/menu", key: "menu", icon: LayoutGrid },
    ];
  }
  if (role === "marketing") {
    return [
      { href: "/overview", key: "overview", icon: LayoutDashboard },
      { href: "/students", key: "students", icon: Users },
      { href: "/tasks", key: "tasks", icon: ListTodo },
      { href: "/follow-up", key: "care", icon: HeartHandshake },
      { href: "/menu", key: "menu", icon: LayoutGrid },
    ];
  }
  return [
    { href: "/overview", key: "overview", icon: LayoutDashboard },
    { href: "/students", key: "students", icon: Users },
    { href: "/mid-course-enroll", key: "enrollTab", icon: UserPlus },
    { href: "/attendance", key: "attendShort", icon: ClipboardCheck },
    { href: "/menu", key: "menu", icon: LayoutGrid },
  ];
}

function active(href: string, path: string) {
  if (href === "/overview") return path === "/overview" || path === "/";
  if (href === "/finance") return path === "/finance";
  if (href === "/attendance") return path === "/attendance" || path.startsWith("/attendance/");
  return path === href || path.startsWith(`${href}/`);
}

function BottomTabFace({
  raised,
  on,
  label,
  badge,
  badgeKind = "count",
  children,
}: {
  raised: boolean;
  on: boolean;
  label: string;
  badge?: number;
  badgeKind?: "count" | "warn" | "danger";
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={cn(
          "absolute left-1/2 flex -translate-x-1/2 items-center justify-center",
          raised
            ? "crm-bottom-active top-0 h-[48px] w-[48px] -translate-y-1/2 rounded-full bg-[var(--brand-500)] text-white"
            : cn("top-3", on ? "text-[var(--brand-600)]" : "text-[var(--muted)]"),
        )}
      >
        {children}
        {badge && badge > 0 ? (
          <span
            className={cn(
              "absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-4 tabular-nums",
              raised ? "bg-white text-slate-700" : navBadgeClassLight(badgeKind),
            )}
          >
            {badge > 99 ? "99" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "absolute inset-x-0 bottom-1.5 truncate px-0.5 text-center text-[11px] leading-tight",
          on ? "font-bold text-[var(--brand-600)]" : "font-medium text-[var(--muted)]",
        )}
      >
        {label}
      </span>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId, setBranchId } = useStudioBranch();
  const seeReport = canSeeMoney(user?.role);
  const canEnroll = user?.role === "boss" || user?.role === "owner" || user?.role === "reception";
  const collect = canCollect(user?.role);
  const branchQuery = branchId !== "all" ? `?branch=${branchId}` : "";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [navHidden, setNavHidden] = useState(false);
  const accessRev = useAccessStore((s) => s.revision);
  const mobile = useMemo(() => mobileForRole(user?.role), [user?.role]);

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const studio = settings?.name || "Edu Dance";
  const navBadges = useNavBadges();
  const { lang, t, setLang } = useI18n();

  useEffect(() => {
    setNavHidden(false);
    const el = mainRef.current;
    if (!el) return;
    let last = el.scrollTop;
    function onScroll() {
      if (!el) return;
      const y = el.scrollTop;
      const delta = y - last;
      last = y;
      if (y < 12) {
        setNavHidden(false);
        return;
      }
      if (delta > 8) setNavHidden(true);
      else if (delta < -8) setNavHidden(false);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [path]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setPaletteOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Mobile: vuốt lên từ vùng đáy → mở Command Palette */
  useEffect(() => {
    if (paletteOpen) return;
    let startY = 0;
    let startX = 0;
    let startT = 0;
    const EDGE_PX = 100;
    const MIN_UP = 56;
    const MAX_SIDE = 48;
    const MAX_MS = 520;

    function isDesktop() {
      return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    }

    function onStart(e: TouchEvent) {
      if (isDesktop() || e.touches.length !== 1) return;
      const t = e.touches[0];
      startY = t.clientY;
      startX = t.clientX;
      startT = Date.now();
    }

    function onEnd(e: TouchEvent) {
      if (isDesktop() || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const fromBottom = startY >= window.innerHeight - EDGE_PX;
      if (!fromBottom) return;
      const dy = startY - t.clientY;
      const dx = Math.abs(t.clientX - startX);
      const dt = Date.now() - startT;
      if (dy >= MIN_UP && dx < MAX_SIDE && dt > 0 && dt <= MAX_MS) {
        setPaletteOpen(true);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [paletteOpen]);

  useEffect(() => {
    if (!user?.role) return;
    if (!canAccessPath(user.role, path)) {
      router.replace(homePathForRole(user.role));
    }
  }, [user?.role, path, router, accessRev]);

  const visibleGroups = useMemo(
    () =>
      [...NAV_GROUPS, NAV_SYSTEM]
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canSeeNavHref(user?.role, item.href)),
        }))
        .filter((group) => group.items.length > 0),
    [user?.role, accessRev],
  );

  const ctas = (extra: string) => (
    <>
      {collect ? (
        <Link href={`/collect-fees${branchQuery}`} className={cn(ctaPrimary, extra)}>
          <Wallet size={16} /> {t.header.collect}
        </Link>
      ) : null}
      <Link href={`/attendance${branchQuery}`} className={cn(ctaPrimary, extra)}>
        <Receipt size={16} /> {t.header.attend}
      </Link>
    </>
  );

  const renderNavLink = (item: { href: string; key: keyof typeof t.nav; icon: typeof LayoutDashboard }) => {
    const on = active(item.href, path);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium leading-snug transition-colors",
          on
            ? "bg-white/12 font-bold text-white"
            : "font-medium text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon size={18} strokeWidth={on ? 2.25 : 1.75} className={on ? "text-[var(--brand-300)]" : undefined} />
        <span className="min-w-0 flex-1 truncate">{t.nav[item.key]}</span>
        {(navBadges[item.href] ?? 0) > 0 ? (
          <span
            className={cn(
              "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              navBadgeClassDark(navBadgeKind(item.href)),
            )}
          >
            {navBadges[item.href]}
          </span>
        ) : null}
      </Link>
    );
  };

  const groupLabelClass = "mb-1.5 px-3 text-xs font-semibold text-white/45";

  function NavPanel({ showBrand, hideHrefs = [] }: { showBrand: boolean; hideHrefs?: string[] }) {
    return (
      <div className="flex h-full flex-col bg-[#030a12] text-white">
        {showBrand ? (
          <Link href="/" className="flex shrink-0 items-center gap-2.5 px-5 py-5 transition-colors hover:bg-white/5">
            <BrandMark className="h-10 w-10" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-white">{t.shell.product}</span>
              <span className="block truncate text-xs text-white/50">{studio}</span>
            </span>
          </Link>
        ) : null}
        <div className="px-3 pb-3">
          <p className={groupLabelClass}>{t.common.branch}</p>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1520] px-3 text-base font-normal text-white"
            aria-label={t.common.branch}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="all">{t.common.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {NAV_TOP.filter((item) => canSeeNavHref(user?.role, item.href) && !hideHrefs.includes(item.href)).length > 0 ? (
            <div className="space-y-0.5">
              {NAV_TOP
                .filter((item) => canSeeNavHref(user?.role, item.href) && !hideHrefs.includes(item.href))
                .map((item) => renderNavLink(item))}
            </div>
          ) : null}
          {visibleGroups.map((group) => {
            const items = group.items.filter((item) => !hideHrefs.includes(item.href));
            if (items.length === 0) return null;
            return (
            <div key={group.title} className="border-t border-white/10 pt-3">
              <p className={groupLabelClass}>{t.nav[group.title]}</p>
              <div className="space-y-0.5">
                {items.map((item) => renderNavLink(item))}
              </div>
            </div>
            );
          })}
          {canSeeNavHref(user?.role, NAV_AI.href) ? renderNavLink(NAV_AI) : null}
        </nav>
        {user ? (
          <div className="shrink-0 border-t border-white/10 bg-[#030a12] p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--brand-500)" }}
                aria-hidden
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-white">{user.name}</p>
                <p className="truncate text-xs text-white/50">{roleLabel(user.role, lang)}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={t.common.logout}
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-x-hidden overflow-hidden bg-[var(--background)]">
      <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#030a12] lg:flex">
        <NavPanel showBrand />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[56px] max-h-[56px] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 lg:hidden">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-transparent bg-[var(--search)] px-3 text-left text-sm text-[var(--muted)]"
            aria-label={t.shell.search}
          >
            <Search size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.shell.searchShort}</span>
          </button>
          <div
            role="group"
            aria-label={t.common.language}
            className="inline-flex h-8 shrink-0 items-center rounded-xl border border-[var(--border)] bg-white p-0.5 text-[11px] font-bold"
          >
            {(["vi", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={cn(
                  "h-7 rounded-lg px-1.5",
                  lang === code ? "bg-[var(--brand-500)] text-white" : "text-slate-500",
                )}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </header>
        <header className={cn("z-30 hidden shrink-0 flex-wrap items-center gap-2 px-5 py-2.5 lg:flex", path === "/overview" ? "bg-[var(--card)]" : "bg-[var(--background)]")}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-transparent bg-[var(--search)] px-4 text-left text-sm text-[var(--muted)] hover:bg-[var(--brand-100)] lg:max-w-md"
            aria-label={t.shell.search}
          >
            <Search size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.shell.search}</span>
            <kbd className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {t.shell.searchHint}
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div
              role="group"
              aria-label={t.common.language}
              className="inline-flex h-9 shrink-0 items-center rounded-xl border border-[var(--border)] bg-white p-0.5 text-xs font-bold"
            >
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    "min-h-8 rounded-lg px-2.5",
                    lang === code ? "bg-[var(--brand-500)] text-white" : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-[var(--brand-50)] sm:inline-flex"
              aria-label={t.shell.notifications}
            >
              <Bell size={18} />
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              {ctas("h-10 min-h-10 px-4")}
              {canEnroll ? (
                <Link href={`/mid-course-enroll${branchQuery}`} className={cn(ctaOutline, "h-10 min-h-10 px-4")}>
                  {t.header.enroll}
                </Link>
              ) : null}
              {seeReport ? (
                <Link href={`/revenue${branchQuery}`} className={cn(ctaOutline, "h-10 min-h-10 px-4")}>
                  {t.header.report}
                </Link>
              ) : null}
            </div>
            {user ? (
              <div className="hidden items-center gap-2 xl:flex">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--brand-500)" }}
                  title={user.name}
                >
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-[var(--brand-50)]"
              aria-label={t.common.logout}
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main ref={mainRef} className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-[10px] py-4 sm:px-5 lg:pb-6 max-lg:pb-[calc(6.75rem+max(0.625rem,env(safe-area-inset-bottom)))]">
          <div key={path} className="crm-tab-panel shrink-0">
            <AppBreadcrumb />
            {children}
          </div>
          <footer className="mt-auto shrink-0 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">{t.shell.footerBrand}</p>
            <p className="mt-1">{t.shell.footerMotto}</p>
            <a href="https://dolphin-software.io.vn/" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[var(--brand-600)] hover:underline">
              {t.shell.footerSite}
            </a>
          </footer>
        </main>
      </div>
      <nav className={cn("crm-bottom-nav fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 pt-[24px] lg:hidden", navHidden && "is-hidden")}>
        <div className="crm-bottom-pill grid h-16 grid-cols-5">
          {mobile.map((item, index) => {
            const Icon = item.icon;
            const raised = index === 2;
            const on = active(item.href, path);
            const label = t.nav[item.key];
            const badge = item.href === "/students" ? navBadges["/students"] ?? 0 : 0;
            const href = item.href === "/mid-course-enroll" ? `/mid-course-enroll${branchQuery}` : item.href;
            return (
              <Link key={item.href} href={href} className="relative h-16" aria-current={on ? "page" : undefined}>
                <BottomTabFace raised={raised} on={on} label={label} badge={badge} badgeKind={navBadgeKind(item.href)}>
                  <Icon size={22} strokeWidth={raised || on ? 2.25 : 1.75} />
                </BottomTabFace>
              </Link>
            );
          })}
        </div>
      </nav>
      <a
        href={ZALO_FOUNDER}
        target="_blank"
        rel="noreferrer"
        aria-label={t.nav.support}
        title={t.nav.support}
        className="fixed right-5 bottom-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-slate-50 lg:inline-flex"
      >
        <SupportIcon className="h-6 w-6" />
      </a>
      {/* FAB chỉ desktop — mobile: vuốt lên từ đáy / ô tìm header */}
      {!paletteOpen ? (
        <button
          type="button"
          className="crm-cmd-fab fixed right-5 bottom-[4.75rem] z-50 hidden lg:inline-flex"
          aria-label={t.shell.paletteFab}
          title={t.shell.paletteFab}
          onClick={() => setPaletteOpen(true)}
        >
          <Sparkles size={20} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
