"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaGhost, ctaOutline, ctaPrimary } from "@/components/ui";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

const top = [
  { href: "/", key: "overview" as const, icon: LayoutDashboard },
  { href: "/lich", key: "schedule" as const, icon: CalendarDays },
];

const groups = [
  {
    title: "manage" as const,
    items: [
      { href: "/hoc-vien", key: "students" as const, icon: Users },
      { href: "/khoa-hoc", key: "courses" as const, icon: BookOpen },
      { href: "/lop-hoc", key: "classes" as const, icon: GraduationCap },
      { href: "/giao-vien", key: "teachers" as const, icon: UserRound },
      { href: "/phong", key: "rooms" as const, icon: DoorOpen },
      { href: "/goi-buoi", key: "packages" as const, icon: Package },
    ],
  },
  {
    title: "enrollGroup" as const,
    items: [
      { href: "/ghi-danh", key: "midEnroll" as const, icon: ClipboardCheck },
      { href: "/promotion", key: "promotion" as const, icon: Tags },
      { href: "/cham-soc", key: "care" as const, icon: HeartHandshake },
    ],
  },
  {
    title: "finance" as const,
    items: [
      { href: "/thu-hoc-phi", key: "collect" as const, icon: Wallet },
      { href: "/bao-luu", key: "holds" as const, icon: PauseCircle },
      { href: "/doanh-thu", key: "revenue" as const, icon: LineChart },
    ],
  },
  {
    title: "ops" as const,
    items: [
      { href: "/diem-danh", key: "attend" as const, icon: Receipt },
      { href: "/diem-danh-qr", key: "attendQr" as const, icon: QrCode },
      { href: "/tac-vu", key: "tasks" as const, icon: ListTodo },
      { href: "/dat-phong", key: "bookings" as const, icon: DoorOpen },
    ],
  },
];

const ai = { href: "/ai", key: "ai" as const, icon: Sparkles };

const ZALO_FOUNDER = "https://zalo.me/0779937633";

const mobile = [
  { href: "/", key: "overview" as const, icon: LayoutDashboard },
  { href: "/lich", key: "schedule" as const, icon: CalendarDays },
  { href: "/diem-danh", key: "attendShort" as const, icon: Receipt },
  { href: "/ghi-danh", key: "enrollShort" as const, icon: Plus },
  { href: ZALO_FOUNDER, key: "support" as const, external: true as const },
];

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
  const branchQuery = branchId !== "all" ? `?branch=${branchId}` : "";
  const [open, setOpen] = useState(false);

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const studio = settings?.name || "Edu Dance";
  const { lang, t, setLang } = useI18n();

  const ctas = (extra: string) => (
    <>
      <Link href={`/diem-danh${branchQuery}`} className={cn(ctaPrimary, extra)}>
        <Receipt size={16} /> {t.header.attend}
      </Link>
      <Link href={`/ghi-danh${branchQuery}`} className={cn(ctaOutline, extra)}>
        <Plus size={16} /> {t.header.enroll}
      </Link>
      {seeReport ? (
        <Link href={`/doanh-thu${branchQuery}`} className={cn(ctaGhost, extra)}>
          <LineChart size={16} /> {t.header.report}
        </Link>
      ) : null}
    </>
  );

  const linkClass = (href: string) =>
    cn(
      "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium",
      active(href, path) ? "bg-[var(--brand-50)] text-[var(--brand-600)]" : "text-slate-600 hover:bg-slate-50",
    );

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 pt-4 pb-3">
        <BrandMark className="h-9 w-9" />
        <span className="min-w-0 pr-6">
          <span className="block truncate text-sm font-bold text-slate-900">Dolphin CRM</span>
          <span className="block truncate text-xs text-slate-500">{studio}</span>
        </span>
      </Link>
      <div className="px-3 pb-3">
        <label className="block text-xs font-medium text-slate-500">
          {t.common.branch}
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-[#E2E8F0] bg-white px-3 text-base text-slate-700"
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
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {top.map((item) => {
            const Icon = item.icon;
            return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
              <Icon size={16} />
              {t.nav[item.key]}
            </Link>
            );
          })}
        </div>
        {groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => user?.role !== "teacher" || (item.href !== "/thu-hoc-phi" && item.href !== "/doanh-thu")),
          }))
          .filter((group) => group.items.length > 0)
          .map((group) => (
          <div key={group.title}>
            <p className="mt-2 border-t border-[#E2E8F0] px-2.5 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              {t.nav[group.title]}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
                      <Icon size={16} />
                      {t.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Link href={ai.href} onClick={() => setOpen(false)} className={linkClass(ai.href)}>
          <Sparkles size={16} />
          {t.nav[ai.key]}
        </Link>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">{nav}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-label={t.common.close} />
          <aside className="relative h-full w-72 bg-white shadow-xl">
            <button className="absolute top-3 right-3 z-10" onClick={() => setOpen(false)} aria-label={t.common.close}>
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
            <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] lg:hidden" onClick={() => setOpen(true)} aria-label={t.common.menu}>
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{studio}</p>
              <p className="truncate text-xs text-slate-500">{user ? roleLabel(user.role, lang) : ""}</p>
            </div>
            <div role="group" aria-label={t.common.language} className="inline-flex h-10 shrink-0 items-center rounded-[10px] border border-[#E2E8F0] p-0.5 text-xs font-bold">
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn("h-8 rounded-[8px] px-2", lang === code ? "bg-[var(--brand-500)] text-white" : "text-slate-500 hover:bg-slate-100")}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-2 lg:flex">{ctas("")}</div>
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100"
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
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-5 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          {mobile.map((item) => {
            const className = cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              !("external" in item) && active(item.href, path) ? "text-[var(--brand-600)]" : "text-slate-400",
            );
            if ("external" in item && item.external) {
              return (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>
                  <SupportIcon className="h-[18px] w-[18px] opacity-70" />
                  {t.nav[item.key]}
                </a>
              );
            }
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={className}>
                <Icon size={18} />
                {t.nav[item.key]}
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
        className="fixed right-5 bottom-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-500)] text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-[var(--brand-600)] lg:inline-flex"
      >
        <SupportIcon className="h-[22px] w-[22px] brightness-0 invert" />
      </a>
    </div>
  );
}
