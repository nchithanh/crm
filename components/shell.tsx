"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";

const groups = [
  {
    title: "Tổng quan",
    items: [{ href: "/", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    title: "Tuyển sinh",
    items: [{ href: "/khach-tiem-nang", label: "Khách tiềm năng", icon: UserPlus }],
  },
  {
    title: "Học vụ",
    items: [
      { href: "/hoc-vien", label: "Học viên", icon: Users },
      { href: "/lich", label: "Lịch học", icon: CalendarDays },
      { href: "/diem-danh", label: "Điểm danh", icon: ClipboardCheck },
      { href: "/goi", label: "Gói học", icon: Package },
    ],
  },
  {
    title: "Tài chính",
    items: [{ href: "/cong-no", label: "Công nợ", icon: Wallet }],
  },
];

const mobile = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/khach-tiem-nang", label: "Lead", icon: UserPlus },
  { href: "/hoc-vien", label: "Học viên", icon: Users },
  { href: "/lich", label: "Lịch", icon: CalendarDays },
  { href: "/diem-danh", label: "Điểm danh", icon: ClipboardCheck },
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

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-500 text-sm font-bold text-white">
          D
        </span>
        <div>
          <p className="text-sm font-bold">Dolphin CRM</p>
          <p className="text-xs text-slate-400">Trung tâm dạy nhảy</p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const on = active(item.href, path);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-sm font-medium",
                        on ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
            <button className="absolute top-3 right-3" onClick={() => setOpen(false)} aria-label="Đóng">
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
