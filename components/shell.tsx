"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Ellipsis,
  Menu,
  Moon,
  Package,
  QrCode,
  Receipt,
  Search,
  Sparkles,
  Sun,
  Tags,
  UserRound,
  Users,
  Wallet,
  X,
  ListTodo,
  PauseCircle,
  BookOpen,
  HeartHandshake,
  LineChart,
  Plus,
} from "lucide-react";
import { AppBreadcrumb } from "@/components/breadcrumb";
import { BrandMark } from "@/components/brand-mark";
import { CommandPalette } from "@/components/command-palette";
import { SupportIcon } from "@/components/support-icon";
import { canAccessPath, canSeeMoney, canSeeNavHref } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaGhost, ctaOutline, ctaPrimary } from "@/components/ui";
import { applyDocumentTheme, readStoredTheme, writeStoredTheme, type CrmTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Role } from "@/types";

const top = [
  { href: "/overview", key: "overview" as const, icon: LayoutDashboard },
  { href: "/schedule", key: "schedule" as const, icon: CalendarDays },
];

const groups = [
  {
    title: "manage" as const,
    items: [
      { href: "/students", key: "students" as const, icon: Users },
      { href: "/courses", key: "courses" as const, icon: BookOpen },
      { href: "/classes", key: "classes" as const, icon: GraduationCap },
      { href: "/teachers", key: "teachers" as const, icon: UserRound },
      { href: "/rooms", key: "rooms" as const, icon: DoorOpen },
      { href: "/subscriptions", key: "packages" as const, icon: Package },
    ],
  },
  {
    title: "enrollGroup" as const,
    items: [
      { href: "/mid-course-enroll", key: "midEnroll" as const, icon: ClipboardCheck },
      { href: "/promotion", key: "promotion" as const, icon: Tags },
      { href: "/follow-up", key: "care" as const, icon: HeartHandshake },
    ],
  },
  {
    title: "finance" as const,
    items: [
      { href: "/finance", key: "financeOverview" as const, icon: LayoutDashboard },
      { href: "/collect-fees", key: "collect" as const, icon: Wallet },
      { href: "/receivables", key: "debts" as const, icon: Receipt },
      { href: "/revenue", key: "revenue" as const, icon: LineChart },
      { href: "/collections", key: "ledger" as const, icon: ArrowLeftRight },
    ],
  },
  {
    title: "ops" as const,
    items: [
      { href: "/attendance", key: "attend" as const, icon: Receipt },
      { href: "/qr-attendance", key: "attendQr" as const, icon: QrCode },
      { href: "/holds", key: "holds" as const, icon: PauseCircle },
      { href: "/tasks", key: "tasks" as const, icon: ListTodo },
      { href: "/room-bookings", key: "bookings" as const, icon: DoorOpen },
    ],
  },
];

const ai = { href: "/dolphin-ai", key: "ai" as const, icon: Sparkles };

const ZALO_FOUNDER = "https://zalo.me/0779937633";

type MobileItem = {
  href: string;
  key: "overview" | "students" | "attendShort" | "finance" | "tasks";
  icon: typeof LayoutDashboard;
};

function mobileForRole(role: Role | undefined): MobileItem[] {
  if (role === "teacher") {
    return [
      { href: "/overview", key: "overview", icon: LayoutDashboard },
      { href: "/students", key: "students", icon: Users },
      { href: "/attendance", key: "attendShort", icon: ClipboardCheck },
      { href: "/tasks", key: "tasks", icon: ListTodo },
    ];
  }
  return [
    { href: "/overview", key: "overview", icon: LayoutDashboard },
    { href: "/students", key: "students", icon: Users },
    { href: "/attendance", key: "attendShort", icon: ClipboardCheck },
    { href: "/finance", key: "finance", icon: Wallet },
  ];
}

function active(href: string, path: string) {
  if (href === "/overview") return path === "/overview" || path === "/";
  if (href === "/finance") {
    return path === "/finance" || path.startsWith("/collect-fees") || path.startsWith("/receivables") || path.startsWith("/revenue") || path.startsWith("/collections");
  }
  if (href === "/attendance") return path === "/attendance" || path.startsWith("/attendance/") || path.startsWith("/qr-attendance");
  return path === href || path.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const { branchId, setBranchId } = useStudioBranch();
  const seeReport = canSeeMoney(user?.role);
  const canEnroll = user?.role === "owner" || user?.role === "reception";
  const branchQuery = branchId !== "all" ? `?branch=${branchId}` : "";
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<CrmTheme>("light");
  const mobile = useMemo(() => mobileForRole(user?.role), [user?.role]);

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const studio = settings?.name || "Edu Dance";
  const { lang, t, setLang } = useI18n();

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyDocumentTheme(stored);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setPaletteOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    if (!canAccessPath(user.role, path)) {
      router.replace("/overview");
    }
  }, [user?.role, path, router]);

  function toggleTheme() {
    const next: CrmTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    writeStoredTheme(next);
    applyDocumentTheme(next);
  }

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canSeeNavHref(user?.role, item.href)),
        }))
        .filter((group) => group.items.length > 0),
    [user?.role],
  );

  const ctas = (extra: string) => (
    <>
      <Link href={`/attendance${branchQuery}`} className={cn(ctaPrimary, extra)}>
        <Receipt size={16} /> {t.header.attend}
      </Link>
      {canEnroll ? (
        <Link href={`/mid-course-enroll${branchQuery}`} className={cn(ctaOutline, extra)}>
          <Plus size={16} /> {t.header.enroll}
        </Link>
      ) : null}
      {seeReport ? (
        <Link href={`/revenue${branchQuery}`} className={cn(ctaGhost, extra)}>
          <LineChart size={16} /> {t.header.report}
        </Link>
      ) : null}
    </>
  );

  const renderNavLink = (
    item: { href: string; key: keyof typeof t.nav; icon: typeof LayoutDashboard },
    onNavigate?: () => void,
  ) => {
    const on = active(item.href, path);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "relative flex min-h-11 items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px] font-medium leading-snug",
          on
            ? "bg-[var(--brand-50)] text-[var(--brand-600)]"
            : "text-[var(--foreground)]/80 hover:bg-[var(--brand-50)]/70",
        )}
      >
        <Icon size={18} strokeWidth={on ? 2.25 : 1.75} />
        <span className="flex-1">{t.nav[item.key]}</span>
      </Link>
    );
  };

  const groupLabelClass = "mb-1 px-3 text-[11px] font-bold tracking-wide text-slate-400 uppercase";

  function NavPanel({ showBrand }: { showBrand: boolean }) {
    const close = () => setOpen(false);
    return (
      <div className="flex h-full flex-col bg-[var(--card)]">
        {showBrand ? (
          <Link href="/" onClick={close} className="flex shrink-0 items-center gap-2.5 px-5 py-5">
            <BrandMark className="h-10 w-10" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-[var(--brand-600)]">{t.shell.product}</span>
              <span className="block truncate text-xs text-slate-400">{studio}</span>
            </span>
          </Link>
        ) : null}
        <div className="px-3 pb-3">
          <p className={groupLabelClass}>{t.common.branch}</p>
          <select
            className="h-11 w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-3 text-base font-normal text-[var(--foreground)]"
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
        <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          <div className="space-y-0.5">
            {top
              .filter((item) => canSeeNavHref(user?.role, item.href))
              .map((item) => renderNavLink(item, close))}
          </div>
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className={groupLabelClass}>{t.nav[group.title]}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => renderNavLink(item, close))}
              </div>
            </div>
          ))}
          {canSeeNavHref(user?.role, ai.href) ? renderNavLink(ai, close) : null}
        </nav>
        {user ? (
          <div className="shrink-0 border-t border-[var(--border)] p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--brand-500)" }}
                aria-hidden
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel(user.role, lang)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)]">
      <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
        <NavPanel showBrand />
      </aside>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-label={t.common.close} />
          <div className="fixed top-0 left-0 z-[51] flex h-full w-[min(86vw,320px)] flex-col bg-[var(--card)] shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <BrandMark className="h-8 w-8" />
                <p className="font-bold text-[var(--brand-600)]">{t.shell.product}</p>
              </div>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-[var(--brand-50)]" onClick={() => setOpen(false)} aria-label={t.common.close}>
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <NavPanel showBrand={false} />
            </div>
          </div>
        </>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--card)]/95 px-3 py-2.5 backdrop-blur sm:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t.common.menu}
          >
            <Menu size={18} />
          </button>
          <div className="hidden min-w-0 sm:block lg:hidden">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{studio}</p>
            <p className="truncate text-xs text-slate-500">{user ? roleLabel(user.role, lang) : ""}</p>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-transparent bg-[var(--brand-50)] px-4 text-left text-sm text-[var(--muted)] hover:bg-[var(--brand-100)] lg:max-w-md"
            aria-label={t.shell.search}
          >
            <Search size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.shell.search}</span>
            <kbd className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:inline">
              {t.shell.searchHint}
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/dolphin-ai"
              className="hidden h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--brand-50)] md:inline-flex"
            >
              <Sparkles size={16} className="text-[var(--brand-600)]" />
              {t.shell.askDolphin}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-[var(--brand-50)]"
              aria-label={theme === "light" ? t.shell.themeDark : t.shell.themeLight}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div
              role="group"
              aria-label={t.common.language}
              className="inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--border)] p-0.5 text-xs font-bold"
            >
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    "min-h-8 rounded-full px-2.5",
                    lang === code ? "bg-[var(--brand-500)] text-white" : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-[var(--brand-50)] sm:inline-flex"
              aria-label={t.shell.notifications}
            >
              <Bell size={18} />
            </button>
            <div className="hidden items-center gap-2 lg:flex">{ctas("")}</div>
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
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-[var(--brand-50)]"
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
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:px-5 lg:pb-6">
          <AppBreadcrumb />
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,26,46,0.04)] lg:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {mobile.map((item) => {
            const Icon = item.icon;
            const on = active(item.href, path);
            const label = item.key === "attendShort" ? t.nav.attendShort : t.nav[item.key];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-[11px] font-semibold leading-tight",
                  on ? "text-[var(--brand-600)]" : "text-[var(--muted)]",
                )}
              >
                <Icon size={20} strokeWidth={on ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-[11px] font-semibold leading-tight",
              open ? "text-[var(--brand-600)]" : "text-[var(--muted)]",
            )}
          >
            <Ellipsis size={20} strokeWidth={open ? 2.25 : 1.75} />
            {t.nav.more}
          </button>
        </div>
      </nav>
      <a
        href={ZALO_FOUNDER}
        target="_blank"
        rel="noreferrer"
        aria-label={t.nav.support}
        title={t.nav.support}
        className="fixed right-5 bottom-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-lg hover:bg-slate-50 lg:inline-flex"
      >
        <SupportIcon className="h-6 w-6" />
      </a>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
