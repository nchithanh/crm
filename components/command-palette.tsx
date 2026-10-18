"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  Clock,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Search,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { canSeeMoney, canSeeNavHref } from "@/lib/access";
import { loadCmdRecent, pushCmdRecent, type CmdKind, type CmdRecentItem } from "@/lib/command-recent";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { debtRemaining } from "@/lib/metrics";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

type Hit = {
  id: string;
  href: string;
  title: string;
  hint: string;
  group: string;
  kind: CmdKind;
  icon: LucideIcon;
  /** Soft AI glow on icon tile */
  ai?: boolean;
  /** Tiny sparkle + pulse on quick actions */
  sparkle?: boolean;
};

type GroupBlock = { key: string; title: string; items: Hit[] };

const GROUP_LIMIT = 5;

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
  { href: "/payment-accounts", titleVi: "Tài khoản thanh toán", titleEn: "Payment accounts", hintVi: "SePay", hintEn: "SePay" },
  { href: "/attendance", titleVi: "Điểm danh", titleEn: "Attendance", hintVi: "Tay", hintEn: "Manual" },
  { href: "/tasks", titleVi: "Tác vụ", titleEn: "Tasks", hintVi: "Việc", hintEn: "Work" },
  { href: "/dolphin-ai", titleVi: "Dolphin AI", titleEn: "Dolphin AI", hintVi: "Ask", hintEn: "Ask" },
];

function allowed(role: Role | undefined, href: string) {
  return canSeeNavHref(role, href);
}

function iconForKind(kind: CmdKind): LucideIcon {
  switch (kind) {
    case "student":
      return Users;
    case "course":
      return BookOpen;
    case "class":
      return GraduationCap;
    case "teacher":
      return UserRound;
    case "room":
      return DoorOpen;
    case "task":
      return CheckSquare;
    case "nav":
      return LayoutDashboard;
    case "action":
      return Zap;
    case "recent":
    default:
      return Clock;
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const i = lower.indexOf(needle);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-[var(--brand-50)] px-0.5 font-semibold text-[var(--brand-700)] not-italic">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function matchText(hay: string, q: string) {
  return !q || hay.toLowerCase().includes(q);
}

function CmdIcon({
  icon: Icon,
  ai,
  sparkle,
}: {
  icon: LucideIcon;
  ai?: boolean;
  sparkle?: boolean;
}) {
  return (
    <span className={cn("crm-cmd-icon relative", ai && "is-ai", sparkle && "is-sparkle")}>
      <Icon size={16} aria-hidden />
      {sparkle ? (
        <Sparkles
          size={9}
          className="absolute -top-0.5 -right-0.5 text-[var(--brand-500)]"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const showMoney = canSeeMoney(role);
  const studentsQ = useLiveQuery(() => db.students.toArray(), []);
  const coursesQ = useLiveQuery(() => db.courses.toArray(), []);
  const classesQ = useLiveQuery(() => db.classes.toArray(), []);
  const usersQ = useLiveQuery(() => db.users.toArray(), []);
  const roomsQ = useLiveQuery(() => db.rooms.toArray(), []);
  const tasksQ = useLiveQuery(() => db.tasks.toArray(), []);
  const leadsQ = useLiveQuery(() => db.leads.toArray(), []);
  const installmentsQ = useLiveQuery(() => db.installments.toArray(), []);
  const loading =
    studentsQ === undefined ||
    coursesQ === undefined ||
    classesQ === undefined ||
    usersQ === undefined ||
    roomsQ === undefined ||
    tasksQ === undefined ||
    leadsQ === undefined ||
    installmentsQ === undefined;
  const students = studentsQ ?? [];
  const courses = coursesQ ?? [];
  const classes = classesQ ?? [];
  const users = usersQ ?? [];
  const rooms = roomsQ ?? [];
  const tasks = tasksQ ?? [];
  const leads = leadsQ ?? [];
  const installments = installmentsQ ?? [];

  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<CmdRecentItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    setExpanded({});
    setRecent(loadCmdRecent());
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sh = t.shell;

  const debtStudents = useMemo(() => {
    const ids = new Set<string>();
    for (const row of installments) {
      if (debtRemaining(row) > 0) ids.add(row.studentId);
    }
    return ids.size;
  }, [installments]);

  const openLeads = useMemo(() => leads.filter((l) => l.stage === "new").length, [leads]);

  const suggestions: Hit[] = useMemo(() => {
    const items: Hit[] = [];
    if (allowed(role, "/attendance")) {
      items.push({
        id: "sug-attend",
        href: "/attendance",
        title: sh.paletteAttend,
        hint: sh.paletteAttendHint,
        group: sh.paletteSuggest,
        kind: "action",
        icon: ClipboardCheck,
        ai: true,
      });
    }
    if (showMoney && allowed(role, "/collect-fees") && debtStudents > 0) {
      items.push({
        id: "sug-fees",
        href: "/collect-fees",
        title: sh.paletteFeesPending,
        hint: fill(sh.paletteFeesPendingHint, { n: debtStudents }),
        group: sh.paletteSuggest,
        kind: "action",
        icon: AlertTriangle,
        ai: true,
      });
    }
    if (allowed(role, "/follow-up") && openLeads > 0) {
      items.push({
        id: "sug-leads",
        href: "/follow-up?stage=new",
        title: fill(sh.paletteLeadsOpen, { n: openLeads }),
        hint: sh.paletteLeadsOpenHint,
        group: sh.paletteSuggest,
        kind: "action",
        icon: Sparkles,
        ai: true,
      });
    }
    return items;
  }, [role, showMoney, debtStudents, openLeads, sh]);

  const quickActions: Hit[] = useMemo(() => {
    const items: Hit[] = [
      {
        id: "act-create-student",
        href: "/mid-course-enroll",
        title: sh.paletteCreateStudent,
        hint: sh.paletteCreateStudentHint,
        group: sh.paletteActions,
        kind: "action",
        icon: UserPlus,
        sparkle: true,
      },
      {
        id: "act-create-class",
        href: "/schedule",
        title: sh.paletteCreateClass,
        hint: sh.paletteCreateClassHint,
        group: sh.paletteActions,
        kind: "action",
        icon: PlusCircle,
      },
      {
        id: "act-collect",
        href: "/collect-fees",
        title: sh.paletteCollect,
        hint: sh.paletteCollectHint,
        group: sh.paletteActions,
        kind: "action",
        icon: Wallet,
      },
    ];
    return items.filter((x) => allowed(role, x.href));
  }, [sh, role]);

  const groups: GroupBlock[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    const blocks: GroupBlock[] = [];

    if (!s) {
      if (suggestions.length > 0) {
        blocks.push({ key: "suggest", title: sh.paletteSuggest, items: suggestions });
      }
      if (quickActions.length > 0) {
        blocks.push({ key: "actions", title: sh.paletteActions, items: quickActions });
      }
      if (recent.length > 0) {
        blocks.push({
          key: "recent",
          title: sh.paletteRecent,
          items: recent.map((r, i) => ({
            id: `recent-${i}-${r.href}`,
            href: r.href,
            title: r.title,
            hint: r.hint,
            group: sh.paletteRecent,
            kind: "recent" as const,
            icon: iconForKind(r.kind === "recent" ? "nav" : r.kind),
          })),
        });
      }
      return blocks;
    }

    const actionHits = [...suggestions, ...quickActions].filter((a) => matchText(`${a.title} ${a.hint}`, s));
    if (actionHits.length) {
      blocks.push({ key: "actions", title: sh.paletteActionGroup, items: actionHits });
    }

    const studentHits: Hit[] = [];
    for (const st of students) {
      if (!matchText(`${st.name} ${st.phone} ${st.parentPhone}`, s)) continue;
      studentHits.push({
        id: `st-${st.id}`,
        href: `/students/${st.id}`,
        title: st.name,
        hint: `${sh.paletteHintStudent}${st.phone ? ` · ${st.phone}` : ""}`,
        group: sh.paletteStudents,
        kind: "student",
        icon: Users,
      });
      if (studentHits.length >= 40) break;
    }
    if (studentHits.length) blocks.push({ key: "students", title: sh.paletteStudents, items: studentHits });

    const courseHits: Hit[] = [];
    for (const c of courses) {
      if (!matchText(`${c.name} ${c.style}`, s)) continue;
      courseHits.push({
        id: `co-${c.id}`,
        href: `/courses/${c.id}`,
        title: c.name,
        hint: c.style || sh.paletteCourses,
        group: sh.paletteCourses,
        kind: "course",
        icon: BookOpen,
      });
      if (courseHits.length >= 40) break;
    }
    if (courseHits.length) blocks.push({ key: "courses", title: sh.paletteCourses, items: courseHits });

    const classHits: Hit[] = [];
    for (const cl of classes) {
      if (!matchText(`${cl.name} ${cl.day} ${cl.start} ${cl.index}`, s)) continue;
      classHits.push({
        id: `cl-${cl.id}`,
        href: `/classes/${cl.id}`,
        title: cl.name || `#${cl.index}`,
        hint: `${sh.paletteClasses} · ${cl.day} ${cl.start}`,
        group: sh.paletteClasses,
        kind: "class",
        icon: GraduationCap,
      });
      if (classHits.length >= 40) break;
    }
    if (classHits.length) blocks.push({ key: "classes", title: sh.paletteClasses, items: classHits });

    const teacherHits: Hit[] = [];
    for (const u of users) {
      if (u.role !== "teacher") continue;
      if (!matchText(`${u.name} ${u.phone} ${u.email}`, s)) continue;
      teacherHits.push({
        id: `te-${u.id}`,
        href: `/teachers/${u.id}`,
        title: u.name,
        hint: sh.paletteHintTeacher,
        group: sh.paletteTeachers,
        kind: "teacher",
        icon: UserRound,
      });
      if (teacherHits.length >= 40) break;
    }
    if (teacherHits.length) blocks.push({ key: "teachers", title: sh.paletteTeachers, items: teacherHits });

    const roomHits: Hit[] = [];
    for (const r of rooms) {
      if (!matchText(`${r.name} ${r.floor}`, s)) continue;
      roomHits.push({
        id: `rm-${r.id}`,
        href: "/rooms",
        title: r.name,
        hint: `${sh.paletteHintRoom}${r.floor ? ` · ${r.floor}` : ""}`,
        group: sh.paletteRooms,
        kind: "room",
        icon: DoorOpen,
      });
      if (roomHits.length >= 40) break;
    }
    if (roomHits.length) blocks.push({ key: "rooms", title: sh.paletteRooms, items: roomHits });

    const taskHits: Hit[] = [];
    for (const tk of tasks) {
      if (tk.status === "done") continue;
      if (!matchText(`${tk.title} ${tk.note} ${tk.dueDay}`, s)) continue;
      taskHits.push({
        id: `tk-${tk.id}`,
        href: "/tasks",
        title: tk.title,
        hint: `${sh.paletteHintTask} · ${tk.dueDay}`,
        group: sh.paletteTasks,
        kind: "task",
        icon: CheckSquare,
      });
      if (taskHits.length >= 40) break;
    }
    if (taskHits.length) blocks.push({ key: "tasks", title: sh.paletteTasks, items: taskHits });

    const navHits: Hit[] = [];
    for (const item of NAV) {
      if (!allowed(role, item.href)) continue;
      const title = lang === "vi" ? item.titleVi : item.titleEn;
      const hint = lang === "vi" ? item.hintVi : item.hintEn;
      if (!matchText(`${title} ${hint} ${item.href}`, s)) continue;
      navHits.push({
        id: `nav-${item.href}`,
        href: item.href,
        title,
        hint: `${sh.paletteHintMenu} · ${hint}`,
        group: sh.paletteNav,
        kind: "nav",
        icon: LayoutDashboard,
      });
    }
    if (navHits.length) blocks.push({ key: "nav", title: sh.paletteNav, items: navHits });

    return blocks;
  }, [q, recent, suggestions, quickActions, students, courses, classes, users, rooms, tasks, role, lang, sh]);

  const flatRows = useMemo(() => {
    type Row =
      | { type: "header"; key: string; title: string }
      | { type: "hit"; hit: Hit; flatIndex: number }
      | { type: "more"; key: string; label: string; flatIndex: number; expand: boolean };

    const rows: Row[] = [];
    let flatIndex = 0;
    for (const g of groups) {
      rows.push({ type: "header", key: g.key, title: g.title });
      const isOpen = Boolean(expanded[g.key]);
      const limit = isOpen ? g.items.length : Math.min(GROUP_LIMIT, g.items.length);
      for (let i = 0; i < limit; i++) {
        rows.push({ type: "hit", hit: g.items[i], flatIndex: flatIndex++ });
      }
      if (g.items.length > GROUP_LIMIT) {
        rows.push({
          type: "more",
          key: g.key,
          label: isOpen ? sh.paletteCollapse : `${sh.paletteSeeMore} (${g.items.length - GROUP_LIMIT})`,
          flatIndex: flatIndex++,
          expand: !isOpen,
        });
      }
    }
    return rows;
  }, [groups, expanded, sh.paletteSeeMore, sh.paletteCollapse]);

  type Selectable =
    | { type: "hit"; hit: Hit; flatIndex: number }
    | { type: "more"; key: string; label: string; flatIndex: number; expand: boolean };

  const selectable = useMemo((): Selectable[] => {
    return flatRows.filter((r): r is Selectable => r.type === "hit" || r.type === "more");
  }, [flatRows]);

  useEffect(() => {
    setActive(0);
  }, [q, groups.length]);

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, selectable.length - 1)));
  }, [selectable.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(hit: Hit) {
    pushCmdRecent({
      href: hit.href,
      title: hit.title,
      hint: hit.hint,
      kind: hit.kind === "recent" ? "nav" : hit.kind,
    });
    onClose();
    router.push(hit.href);
  }

  function activate(index: number) {
    const row = selectable[index];
    if (!row) return;
    if (row.type === "more") {
      setExpanded((prev) => ({ ...prev, [row.key]: row.expand }));
      return;
    }
    go(row.hit);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, selectable.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(active);
    }
  }

  if (!open) return null;

  let emptyBody: ReactNode = null;
  if (loading) {
    emptyBody = (
      <div className="space-y-2 px-3 py-3" aria-busy>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--brand-50)]" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-50" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (groups.length === 0) {
    emptyBody = (
      <div className="px-6 py-12 text-center">
        <span className="crm-cmd-icon is-ai mx-auto mb-3">
          <Sparkles size={16} aria-hidden />
        </span>
        <p className="text-sm font-medium text-slate-600">{sh.noResults}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{sh.paletteEmptyHint}</p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-600)] hover:underline"
          onClick={() => {
            onClose();
            router.push("/dolphin-ai");
          }}
        >
          <Sparkles size={14} aria-hidden />
          {t.shell.askDolphin}
        </button>
      </div>
    );
  }

  return (
    <div className="crm-cmd-backdrop fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0" aria-label={t.common.close} onClick={onClose} />
      <div className="crm-cmd-neon relative w-full max-w-xl">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sh.palettePlaceholder}
        className="crm-cmd-panel flex w-full flex-col"
      >
        <div className="crm-cmd-header flex items-center gap-3 border-b border-[var(--border)] px-4">
          <span className="relative inline-flex shrink-0 items-center justify-center" aria-hidden>
            <Search size={20} className="crm-cmd-search-glow" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-[var(--brand-500)] opacity-90" />
          </span>
          <input
            ref={inputRef}
            className="h-14 min-w-0 flex-1 bg-transparent text-[clamp(1rem,0.95rem+0.3svw,1.125rem)] outline-none placeholder:text-slate-400"
            placeholder={sh.palettePlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={sh.palettePlaceholder}
            aria-controls="crm-cmd-list"
            autoComplete="off"
          />
          <kbd className="hidden rounded-xl border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-400 sm:inline">
            ESC
          </kbd>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 sm:hidden"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <X size={16} />
          </button>
        </div>

        <div
          id="crm-cmd-list"
          ref={listRef}
          className="max-h-[min(58vh,26rem)] overflow-y-auto px-2 py-2"
          role="listbox"
          aria-label={sh.palettePlaceholder}
        >
          {emptyBody ??
            flatRows.map((row) => {
              if (row.type === "header") {
                return (
                  <p
                    key={`h-${row.key}`}
                    className="px-3 pb-1 pt-2.5 text-[0.65rem] font-semibold tracking-wide text-slate-400 uppercase"
                  >
                    {row.title}
                  </p>
                );
              }
              if (row.type === "more") {
                const selected = row.flatIndex === active;
                return (
                  <button
                    key={`m-${row.key}`}
                    type="button"
                    data-cmd-idx={row.flatIndex}
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "crm-cmd-item flex w-full px-3 py-2 text-left text-sm font-semibold text-[var(--brand-600)]",
                      selected && "is-active",
                    )}
                    onMouseEnter={() => setActive(row.flatIndex)}
                    onClick={() => activate(row.flatIndex)}
                  >
                    {row.label}
                  </button>
                );
              }
              const { hit, flatIndex } = row;
              const selected = flatIndex === active;
              return (
                <button
                  key={hit.id}
                  type="button"
                  data-cmd-idx={flatIndex}
                  role="option"
                  aria-selected={selected}
                  className={cn("crm-cmd-item flex w-full items-center gap-3 px-3 py-2.5 text-left", selected && "is-active")}
                  onMouseEnter={() => setActive(flatIndex)}
                  onClick={() => go(hit)}
                >
                  <CmdIcon icon={hit.icon} ai={hit.ai} sparkle={hit.sparkle} />
                  <span className="min-w-0 flex-1 pl-0.5">
                    <span className={cn("block truncate text-sm font-bold", selected ? "text-[var(--brand-700)]" : "text-slate-900")}>
                      <Highlight text={hit.title} query={q} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{hit.hint}</span>
                  </span>
                </button>
              );
            })}
        </div>

        <div className="crm-cmd-footer border-t border-[var(--border)] px-4 py-2.5">
          <p className="text-center text-[0.7rem] text-slate-400">{sh.paletteKbd}</p>
          <p className="crm-cmd-footer-ai mt-1 flex items-center justify-center gap-1 text-[0.65rem]">
            <Sparkles size={10} className="text-[var(--brand-500)]" aria-hidden />
            {sh.palettePowered}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
