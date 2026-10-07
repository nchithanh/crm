"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";

const top = { href: "/lich", label: "Lịch", icon: CalendarDays };

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
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    cn(
      "flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-sm font-medium",
      active(href, path) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50",
    );

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-500 text-sm font-bold text-white">
          D
        </span>
        <span>
          <span className="block text-sm font-bold">Dolphin CRM</span>
          <span className="block text-xs text-slate-400">Trung tâm dạy nhảy</span>
        </span>
      </Link>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <Link href={top.href} onClick={() => setOpen(false)} className={linkClass(top.href)}>
          <top.icon size={16} />
          {top.label}
        </Link>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
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
        <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Dolphin Dance Studio</p>
            <p className="truncate text-xs text-slate-400">
              {user?.name} · {user ? roleLabel(user.role) : ""}
            </p>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Đăng xuất"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-5 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          {mobile.map((item) => {
            const Icon = item.icon;
            const on = active(item.href, path);
            return (
              <Link key={item.href} href={item.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-emerald-700" : "text-slate-400")}>
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
