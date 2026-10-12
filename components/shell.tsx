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
  Landmark,
  LayoutDashboard,
  LogOut,
  Ellipsis,
  Menu,
  Package,
  QrCode,
  Receipt,
  Search,
  Sparkles,
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
} from "lucide-react";
import { AppBreadcrumb } from "@/components/breadcrumb";
import { BrandMark } from "@/components/brand-mark";
import { CommandPalette } from "@/components/command-palette";
import { SupportIcon } from "@/components/support-icon";
import { canAccessPath, canCollect, canSeeMoney, canSeeNavHref } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaPrimary } from "@/components/ui";
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
      { href: "/payment-accounts", key: "payAccounts" as const, icon: Landmark },
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
    return path === "/finance" || path.startsWith("/collect-fees") || path.startsWith("/receivables") || path.startsWith("/revenue") || path.startsWith("/collections") || path.startsWith("/payment-accounts");
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
  const collect = canCollect(user?.role);
  const branchQuery = branchId !== "all" ? `?branch=${branchId}` : "";
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [headerMore, setHeaderMore] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mobile = useMemo(() => mobileForRole(user?.role), [user?.role]);

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const roster = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const studio = settings?.name || "Edu Dance";
  const inBranch = (id: string | undefined) => branchId === "all" || id === branchId;
  const openLeads = leads.filter((lead) => lead.stage !== "won" && lead.stage !== "lost").length;
  const owing = roster.filter((student) => student.debt > 0 && inBranch(student.branchId)).length;
  const navBadges: Partial<Record<string, number>> = {
    "/students": roster.filter((student) => student.status === "active" && inBranch(student.branchId)).length,
    "/courses": courses.filter((course) => course.active && inBranch(course.branchId)).length,
    "/classes": sessions.filter((session) => (session.status === "upcoming" || session.status === "ongoing") && inBranch(session.branchId)).length,
    "/teachers": users.filter((person) => person.role === "teacher" && person.teacherStatus === "active" && inBranch(person.branchId)).length,
    "/follow-up": openLeads,
    "/collect-fees": owing,
  };
  const { lang, t, setLang } = useI18n();

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
          "relative flex min-h-11 items-center gap-3 rounded-[5px] px-3 py-2.5 text-[14px] font-medium leading-snug",
          on
            ? "border-l-[3px] border-[var(--brand-500)] bg-white font-bold text-[var(--brand-700)]"
            : "border-l-[3px] border-transparent font-medium text-white/80 hover:bg-white/10",
        )}
      >
        <Icon size={18} strokeWidth={on ? 2.25 : 1.75} />
        <span className="min-w-0 flex-1 truncate">{t.nav[item.key]}</span>
        {(navBadges[item.href] ?? 0) > 0 ? (
          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--brand-500)] px-1.5 text-[11px] font-semibold text-white tabular-nums">
            {navBadges[item.href]}
          </span>
        ) : null}
      </Link>
    );
  };

  const groupLabelClass = "mb-1.5 px-3 text-xs font-semibold text-[#d4d4e2]";

  function NavPanel({ showBrand }: { showBrand: boolean }) {
    const close = () => {
      setOpen(false);
      setSheetOpen(false);
    };
    return (
      <div className="flex h-full flex-col bg-[#1c1c2a] text-[#f8fafc]" style={{ colorScheme: "dark" }}>
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
            className="h-11 w-full rounded-[5px] border border-[#2e2e44] bg-[#12121c] px-3 text-base font-normal text-[#f8fafc]"
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
          <div className="space-y-0.5">
            {top
              .filter((item) => canSeeNavHref(user?.role, item.href))
              .map((item) => renderNavLink(item, close))}
          </div>
          {visibleGroups.map((group) => (
            <div key={group.title} className="border-t border-[#2e2e44] pt-3">
              <p className={groupLabelClass}>{t.nav[group.title]}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => renderNavLink(item, close))}
              </div>
            </div>
          ))}
          {canSeeNavHref(user?.role, ai.href) ? renderNavLink(ai, close) : null}
        </nav>
        {user ? (
          <div className="shrink-0 border-t border-[#2e2e44] p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--brand-500)" }}
                aria-hidden
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-[#f8fafc]">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel(user.role, lang)}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
                aria-label={t.common.logout}
                onClick={() => {
                  close();
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
    <div className="flex h-dvh overflow-hidden bg-[var(--background)]">
      <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-[#2e2e44] bg-[#1c1c2a] lg:flex">
        <NavPanel showBrand />
      </aside>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-label={t.common.close} />
          <div className="fixed inset-0 z-[51] flex h-full w-full flex-col bg-[#1c1c2a] text-[#f8fafc] lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <BrandMark className="h-8 w-8" />
                <p className="font-bold text-[var(--brand-600)]">{t.shell.product}</p>
              </div>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10" onClick={() => setOpen(false)} aria-label={t.common.close}>
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
        <header className="sticky top-0 z-30 flex h-[56px] max-h-[56px] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-white px-3 lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)]"
            onClick={() => setOpen(true)}
            aria-label={t.common.menu}
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[5px] border border-transparent bg-[var(--search)] px-3 text-left text-sm text-[var(--muted)]"
            aria-label={t.shell.search}
          >
            <Search size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.shell.searchShort}</span>
          </button>
          <div
            role="group"
            aria-label={t.common.language}
            className="inline-flex h-8 shrink-0 items-center rounded-[5px] border border-[var(--border)] p-0.5 text-[11px] font-bold"
          >
            {(["vi", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={cn(
                  "h-7 rounded-[5px] px-1.5",
                  lang === code ? "bg-[var(--brand-500)] text-white" : "text-slate-500",
                )}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </header>
        <header className={cn("z-30 hidden shrink-0 flex-wrap items-center gap-2 px-5 py-2.5 lg:flex", path === "/overview" ? "bg-white" : "bg-[var(--background)]")}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[5px] border border-transparent bg-[var(--search)] px-4 text-left text-sm text-[var(--muted)] hover:bg-[var(--brand-50)] lg:max-w-md"
            aria-label={t.shell.search}
          >
            <Search size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.shell.search}</span>
            <kbd className="shrink-0 rounded-[5px] border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {t.shell.searchHint}
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div
              role="group"
              aria-label={t.common.language}
              className="inline-flex h-9 shrink-0 items-center rounded-[5px] border border-[var(--border)] p-0.5 text-xs font-bold"
            >
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    "min-h-8 rounded-[5px] px-2.5",
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
            <div className="hidden items-center gap-2 lg:flex">
              {ctas("")}
              {canEnroll || seeReport ? (
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-slate-600 hover:bg-slate-50"
                    aria-label={t.nav.more}
                    aria-expanded={headerMore}
                    onClick={() => setHeaderMore((v) => !v)}
                  >
                    <Ellipsis size={18} />
                  </button>
                  {headerMore ? (
                    <div className="absolute right-0 z-40 mt-1 w-44 rounded-[5px] border border-[var(--border)] bg-white p-1">
                      {canEnroll ? (
                        <Link
                          href={`/mid-course-enroll${branchQuery}`}
                          className="block rounded-[5px] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--brand-50)]"
                          onClick={() => setHeaderMore(false)}
                        >
                          {t.header.enroll}
                        </Link>
                      ) : null}
                      {seeReport ? (
                        <Link
                          href={`/revenue${branchQuery}`}
                          className="block rounded-[5px] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--brand-50)]"
                          onClick={() => setHeaderMore(false)}
                        >
                          {t.header.report}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
        <main className={cn("flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-[10px] py-4 pb-24 sm:px-5 lg:pb-6", path === "/overview" && "bg-white")}>
          <div className="shrink-0">
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {mobile.map((item) => {
            const Icon = item.icon;
            const on = active(item.href, path);
            const label = item.key === "attendShort" ? t.nav.attendShort : t.nav[item.key];
            const badge = item.href === "/students" ? navBadges["/students"] ?? 0 : item.href === "/finance" ? navBadges["/collect-fees"] ?? 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[5px] px-1 text-[11px] leading-tight",
                  on ? "bg-[var(--brand-50)] font-bold text-[var(--brand-600)]" : "font-medium text-[var(--muted)]",
                )}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={on ? 2.25 : 1.75} />
                  {badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--brand-500)] px-1 text-[9px] font-bold leading-4 text-white tabular-nums">
                      {badge > 99 ? "99" : badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[5px] px-1 text-[11px] leading-tight",
              sheetOpen ? "bg-[var(--brand-50)] font-bold text-[var(--brand-600)]" : "font-medium text-[var(--muted)]",
            )}
          >
            <Ellipsis size={20} strokeWidth={sheetOpen ? 2.25 : 1.75} />
            {t.nav.more}
          </button>
        </div>
      </nav>
      {sheetOpen ? (
        <div className="lg:hidden">
          <button type="button" className="fixed inset-0 z-50 bg-slate-900/40" onClick={() => setSheetOpen(false)} aria-label={t.common.close} />
          <div
            role="dialog"
            aria-label={t.nav.more}
            className="fixed inset-x-0 bottom-0 z-[51] flex h-[min(80vh,640px)] flex-col overflow-hidden rounded-t-[5px] bg-[#1c1c2a] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex shrink-0 justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-white/30" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <NavPanel showBrand={false} />
            </div>
          </div>
        </div>
      ) : null}
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
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
