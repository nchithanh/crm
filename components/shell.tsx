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
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { ctaGhost, ctaOutline, ctaPrimary } from "@/components/ui";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";

const top = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/lich", label: "Lịch", icon: CalendarDays },
];

const groups = [
  {
    title: "Quản lý",
    items: [
      { href: "/hoc-vien", label: "Học viên", icon: Users },
      { href: "/khoa-hoc", label: "Khóa học", icon: BookOpen },
      { href: "/lop-hoc", label: "Lớp học", icon: GraduationCap },
      { href: "/giao-vien", label: "Giáo viên", icon: UserRound },
      { href: "/phong", label: "Phòng", icon: DoorOpen },
      { href: "/goi-buoi", label: "Gói buổi", icon: Package },
    ],
  },
  {
    title: "Tuyển sinh",
    items: [
      { href: "/ghi-danh", label: "Ghi danh giữa khóa", icon: ClipboardCheck },
      { href: "/promotion", label: "Promotion", icon: Tags },
      { href: "/cham-soc", label: "Chăm sóc", icon: HeartHandshake },
    ],
  },
  {
    title: "Tài chính",
    items: [
      { href: "/thu-hoc-phi", label: "Thu học phí", icon: Wallet },
      { href: "/bao-luu", label: "Bảo lưu", icon: PauseCircle },
      { href: "/doanh-thu", label: "Doanh thu", icon: LineChart },
    ],
  },
  {
    title: "Vận hành",
    items: [
      { href: "/diem-danh", label: "Điểm danh tay", icon: Receipt },
      { href: "/diem-danh-qr", label: "Điểm danh QR", icon: QrCode },
      { href: "/tac-vu", label: "Tác vụ", icon: ListTodo },
      { href: "/dat-phong", label: "Đặt phòng thuê", icon: DoorOpen },
    ],
  },
];

const ai = { href: "/ai", label: "AI vận hành", icon: Sparkles };

const mobile = [
  { href: "/lich", label: "Lịch", icon: CalendarDays },
  { href: "/hoc-vien", label: "Học viên", icon: Users },
  { href: "/diem-danh", label: "Điểm danh", icon: Receipt },
  { href: "/cham-soc", label: "Chăm sóc", icon: HeartHandshake },
  { href: "/thu-hoc-phi", label: "Học phí", icon: Wallet },
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

  const linkClass = (href: string) =>
    cn(
      "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium",
      active(href, path) ? "bg-orange-50 text-[#F97316]" : "text-slate-600 hover:bg-slate-50",
    );

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F97316] text-sm font-bold text-white">D</span>
        <span className="min-w-0 pr-6">
          <span className="block truncate text-sm font-bold text-slate-900">Dolphin CRM</span>
          <span className="block truncate text-xs text-slate-500">{studio}</span>
        </span>
      </Link>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {top.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
                <Icon size={16} />
                {item.label}
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
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Link href={ai.href} onClick={() => setOpen(false)} className={linkClass(ai.href)}>
          <Sparkles size={16} />
          {ai.label}
        </Link>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">{nav}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-label="Đóng menu" />
          <aside className="relative h-full w-72 bg-white shadow-xl">
            <button className="absolute top-3 right-3 z-10" onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
                <Menu size={18} />
              </button>
              <Link href="/" className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">D</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold leading-tight text-slate-900">Dolphin CRM</span>
                  <span className="block truncate text-xs text-slate-500">{studio} · {user ? roleLabel(user.role) : ""}</span>
                </span>
              </Link>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select className="h-10 rounded-[8px] border border-[#E2E8F0] bg-white px-3 text-sm text-slate-700" aria-label="Chi nhánh" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="all">Mọi chi nhánh</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Link href={`/diem-danh${branchQuery}`} className={ctaPrimary}>
                <Receipt size={16} /> Điểm danh
              </Link>
              <Link href={`/ghi-danh${branchQuery}`} className={ctaOutline}>
                <Plus size={16} /> Đăng ký
              </Link>
              {seeReport ? (
                <Link href={`/doanh-thu${branchQuery}`} className={ctaGhost}>
                  <LineChart size={16} /> Báo cáo
                </Link>
              ) : null}
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100"
                aria-label="Đăng xuất"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-5 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          {mobile.map((item) => {
            const Icon = item.icon;
            const on = active(item.href, path);
            return (
              <Link key={item.href} href={item.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-[#C2410C]" : "text-slate-400")}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
