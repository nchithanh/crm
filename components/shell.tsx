"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  Receipt,
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
  Plus,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SupportIcon } from "@/components/support-icon";
import { canAccessPath, canSeeMoney, canSeeNavHref } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaGhost, ctaOutline, ctaPrimary } from "@/components/ui";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Role } from "@/types";

const top = [
  { href: "/", key: "overview" as const, icon: LayoutDashboard },
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
      { href: "/enroll", key: "midEnroll" as const, icon: ClipboardCheck },
      { href: "/promotion", key: "promotion" as const, icon: Tags },
      { href: "/leads", key: "care" as const, icon: HeartHandshake },
    ],
  },
  {
    title: "finance" as const,
    items: [
      { href: "/fees", key: "collect" as const, icon: Wallet },
      { href: "/holds", key: "holds" as const, icon: PauseCircle },
      { href: "/revenue", key: "revenue" as const, icon: LineChart },
    ],
  },
  {
    title: "ops" as const,
    items: [
      { href: "/attendance", key: "attend" as const, icon: Receipt },
      { href: "/diem-danh-qr", key: "attendQr" as const, icon: QrCode },
      { href: "/tasks", key: "tasks" as const, icon: ListTodo },
      { href: "/dat-phong", key: "bookings" as const, icon: DoorOpen },
    ],
  },
];

const ai = { href: "/ai", key: "ai" as const, icon: Sparkles };

const ZALO_FOUNDER = "https://zalo.me/0779937633";

type MobileItem =
  | { href: string; key: "overview" | "schedule" | "attendShort" | "enrollShort" | "tasks"; icon: typeof LayoutDashboard }
  | { href: string; key: "support"; external: true };

function mobileForRole(role: Role | undefined): MobileItem[] {
  const base: MobileItem[] = [
    { href: "/", key: "overview", icon: LayoutDashboard },
    { href: "/schedule", key: "schedule", icon: CalendarDays },
    { href: "/attendance", key: "attendShort", icon: Receipt },
  ];
  if (role === "teacher") {
    return [
      ...base,
      { href: "/tasks", key: "tasks", icon: ListTodo },
      { href: ZALO_FOUNDER, key: "support", external: true },
    ];
  }
  return [
    ...base,
    { href: "/enroll", key: "enrollShort", icon: Plus },
    { href: ZALO_FOUNDER, key: "support", external: true },
  ];
}

function active(href: string, path: string) {
  if (href === "/") return path === "/";
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
  const mobile = useMemo(() => mobileForRole(user?.role), [user?.role]);

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const studio = settings?.name || "Edu Dance";
  const { lang, t, setLang } = useI18n();

  useEffect(() => {
    if (!user?.role) return;
    if (!canAccessPath(user.role, path)) {
      router.replace("/");
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
      <Link href={`/diem-danh${branchQuery}`} className={cn(ctaPrimary, extra)}>
        <Receipt size={16} /> {t.header.attend}
      </Link>
      {canEnroll ? (
        <Link href={`/enroll${branchQuery}`} className={cn(ctaOutline, extra)}>
          <Plus size={16} /> {t.header.enroll}
        </Link>
      ) : null}
      {seeReport ? (
        <Link href={`/doanh-thu${branchQuery}`} className={cn(ctaGhost, extra)}>
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
          "relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium leading-snug",
          on ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50",
        )}
      >
        {on ? (
          <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--brand-500)]" />
        ) : null}
        <Icon size={18} className={on ? "text-[var(--brand-600)]" : undefined} />
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
              <span className="block truncate text-sm font-bold tracking-wide text-[var(--brand-600)]">DOLPHIN CRM</span>
              <span className="block truncate text-xs text-slate-400">{studio}</span>
            </span>
          </Link>
        ) : null}
        <div className="px-3 pb-3">
          <p className={groupLabelClass}>{t.common.branch}</p>
          <select
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-base font-normal text-slate-700"
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
                <p className="truncate text-sm font-semibold leading-tight text-slate-900">{user.name}</p>
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
                <p className="font-bold text-[var(--brand-600)]">Dolphin CRM</p>
              </div>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label={t.common.close}>
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
        <header className="z-30 flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 backdrop-blur sm:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t.common.menu}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{studio}</p>
            <p className="truncate text-xs text-slate-500">{user ? roleLabel(user.role, lang) : ""}</p>
          </div>
          <div
            role="group"
            aria-label={t.common.language}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-slate-200 p-0.5 text-xs font-bold"
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
          <div className="hidden items-center gap-2 lg:flex">{ctas("")}</div>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100"
            aria-label={t.common.logout}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:px-5 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobile.map((item) => {
            if ("external" in item) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-14 flex-col items-center justify-center gap-1 text-[14px] font-medium text-slate-700"
                >
                  <SupportIcon className="h-5 w-5" />
                  {t.nav.support}
                </a>
              );
            }
            const Icon = item.icon;
            const on = active(item.href, path);
            const label =
              item.key === "tasks"
                ? t.nav.tasks
                : item.key === "attendShort"
                  ? t.nav.attendShort
                  : item.key === "enrollShort"
                    ? t.nav.enrollShort
                    : t.nav[item.key];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] text-[14px] font-medium",
                  on ? "text-[var(--brand-600)]" : "text-slate-700",
                )}
              >
                <Icon size={20} />
                {label}
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
        className="fixed right-5 bottom-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg hover:bg-slate-50 lg:inline-flex"
      >
        <SupportIcon className="h-6 w-6" />
      </a>
    </div>
  );
}
