"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, X } from "lucide-react";
import { canSeeNavHref } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

type Hit = { id: string; href: string; title: string; hint: string; group: string };

const NAV: { href: string; titleVi: string; titleEn: string; hintVi: string; hintEn: string }[] = [
  { href: "/overview", titleVi: "Tổng quan", titleEn: "Overview", hintVi: "Dashboard", hintEn: "Dashboard" },
  { href: "/schedule", titleVi: "Lịch", titleEn: "Schedule", hintVi: "Tuần / tháng", hintEn: "Week / month" },
  { href: "/students", titleVi: "Học viên", titleEn: "Students", hintVi: "Danh sách HV", hintEn: "Student list" },
  { href: "/courses", titleVi: "Khóa học", titleEn: "Courses", hintVi: "Khóa", hintEn: "Courses" },
  { href: "/classes", titleVi: "Buổi học", titleEn: "Classes", hintVi: "Buổi", hintEn: "Sessions" },
  { href: "/teachers", titleVi: "Giáo viên", titleEn: "Teachers", hintVi: "GV", hintEn: "Teachers" },
  { href: "/rooms", titleVi: "Phòng", titleEn: "Rooms", hintVi: "Phòng", hintEn: "Rooms" },
  { href: "/subscriptions", titleVi: "Subscription", titleEn: "Subscriptions", hintVi: "Gói", hintEn: "Plans" },
  { href: "/mid-course-enroll", titleVi: "Ghi danh", titleEn: "Enroll", hintVi: "Giữa khóa", hintEn: "Mid-course" },
  { href: "/follow-up", titleVi: "Chăm sóc", titleEn: "Follow-up", hintVi: "Lead", hintEn: "Leads" },
  { href: "/collect-fees", titleVi: "Thu học phí", titleEn: "Collect fees", hintVi: "Thu", hintEn: "Collect" },
  { href: "/receivables", titleVi: "Công nợ", titleEn: "Receivables", hintVi: "Nợ", hintEn: "Debt" },
  { href: "/revenue", titleVi: "Doanh thu", titleEn: "Revenue", hintVi: "Báo cáo", hintEn: "Report" },
  { href: "/collections", titleVi: "Lịch sử thu", titleEn: "Collections", hintVi: "Thu", hintEn: "Ledger" },
  { href: "/attendance", titleVi: "Điểm danh", titleEn: "Attendance", hintVi: "Tay", hintEn: "Manual" },
  { href: "/tasks", titleVi: "Tác vụ", titleEn: "Tasks", hintVi: "Việc", hintEn: "Work" },
  { href: "/dolphin-ai", titleVi: "Dolphin AI", titleEn: "Dolphin AI", hintVi: "Ask", hintEn: "Ask" },
];

function allowed(role: Role | undefined, href: string) {
  return canSeeNavHref(role, href);
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out: Hit[] = [];
    const navGroup = lang === "vi" ? "Menu" : "Navigate";
    for (const item of NAV) {
      if (!allowed(role, item.href)) continue;
      const title = lang === "vi" ? item.titleVi : item.titleEn;
      const hint = lang === "vi" ? item.hintVi : item.hintEn;
      if (!s || `${title} ${hint} ${item.href}`.toLowerCase().includes(s)) {
        out.push({ id: `nav-${item.href}`, href: item.href, title, hint, group: navGroup });
      }
    }
    if (s.length >= 1) {
      for (const st of students.slice(0, 80)) {
        if (!`${st.name} ${st.phone}`.toLowerCase().includes(s)) continue;
        out.push({
          id: `st-${st.id}`,
          href: `/students?student=${st.id}`,
          title: st.name,
          hint: lang === "vi" ? "Học viên" : "Student",
          group: lang === "vi" ? "Học viên" : "Students",
        });
      }
      for (const c of courses.slice(0, 40)) {
        if (!`${c.name} ${c.style}`.toLowerCase().includes(s)) continue;
        out.push({
          id: `co-${c.id}`,
          href: `/courses/${c.id}`,
          title: c.name,
          hint: c.style,
          group: lang === "vi" ? "Khóa học" : "Courses",
        });
      }
      for (const cl of classes.slice(0, 40)) {
        if (!`${cl.name} ${cl.day}`.toLowerCase().includes(s)) continue;
        out.push({
          id: `cl-${cl.id}`,
          href: `/classes/${cl.id}`,
          title: `#${cl.index} · ${cl.day}`,
          hint: cl.name,
          group: lang === "vi" ? "Buổi học" : "Classes",
        });
      }
    }
    return out.slice(0, 40);
  }, [q, students, courses, classes, role, lang]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active].href);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
      <button type="button" className="absolute inset-0" aria-label={t.common.close} onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            placeholder={t.shell.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={t.shell.search}
          />
          <kbd className="hidden rounded-[6px] border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:inline">ESC</kbd>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-500 hover:bg-slate-100 sm:hidden" onClick={onClose} aria-label={t.common.close}>
            <X size={16} />
          </button>
        </div>
        <ul className="max-h-[min(50vh,360px)] overflow-y-auto py-2" role="listbox">
          {hits.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">{t.shell.noResults}</li>
          ) : (
            hits.map((hit, i) => (
              <li key={hit.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm",
                    i === active ? "bg-[var(--brand-50)] text-[var(--brand-700)]" : "hover:bg-slate-50",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit.href)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{hit.title}</span>
                    <span className="block truncate text-xs text-slate-400">{hit.group} · {hit.hint}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
