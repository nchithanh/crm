"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  ChevronDown,
  LineChart,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ctaOutline } from "@/components/ui";
import { FeeRemindButton } from "@/components/finance/fee-reminders";
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { debtRemaining } from "@/lib/metrics";
import { levelLabel } from "@/lib/rules";
import { cn, formatVnd, initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { useStudioBranch } from "@/stores/branch-store";
import type { LucideIcon } from "lucide-react";

type Period = "today" | "d7" | "d30" | "month";

/** Doanh thu demo T1–T12, triệu đồng. Không đọc phiếu thu. */
const YEAR_REVENUE = [18, 16, 21, 19, 24, 22, 26, 23, 28, 25, 30, 27].map((million, i) => ({
  label: `T${i + 1}`,
  amount: million * 1_000_000,
}));

function addDays(base: string, delta: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

function monthShift(prefix: string, delta: number) {
  const [y, m] = prefix.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function relativeDay(day: string, today: string, words: { today: string; yesterday: string; ago: string }) {
  if (day === today) return words.today;
  if (day === addDays(today, -1)) return words.yesterday;
  const n = Math.round(
    (new Date(`${today}T12:00:00`).getTime() - new Date(`${day}T12:00:00`).getTime()) / 86400000,
  );
  if (Number.isNaN(n)) return day;
  return n > 0 ? words.ago.replace("{n}", String(n)) : day;
}

function compactVnd(amount: number) {
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    return `${Number.isInteger(tr) ? tr : tr.toFixed(1)}tr`;
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(Math.round(amount));
}

function trend(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="mt-2 flex h-6 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="w-1.5 rounded-sm bg-[var(--brand-500)]" style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function ChartTip({
  active,
  payload,
  label,
  receipts,
}: {
  active?: boolean;
  payload?: { payload?: { amount?: number; count?: number } }[];
  label?: string;
  receipts?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-[5px] border border-slate-200 bg-[var(--card)] px-3 py-2 text-xs">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums">{formatVnd(row?.amount ?? 0)}</p>
      {typeof row?.count === "number" ? (
        <p className="tabular-nums text-slate-500">{row.count} {receipts}</p>
      ) : null}
    </div>
  );
}

function useWideLayout() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 641px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide;
}

/** Trên ≤640px chỉ hiện tiêu đề; từ 641px nội dung luôn mở. */
function MobileFold({
  title,
  headingId,
  panelId,
  titleClassName = "text-base font-semibold",
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  headingId?: string;
  panelId: string;
  titleClassName?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wide = useWideLayout();
  return (
    <>
      <h2 id={headingId} className={cn("w-full", titleClassName)}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left font-[inherit] text-[inherit] max-[640px]:min-h-11 min-[641px]:pointer-events-none"
          aria-expanded={wide || open}
          aria-controls={panelId}
          tabIndex={wide ? -1 : 0}
          onClick={() => {
            if (!wide) setOpen((v) => !v);
          }}
        >
          <span className="min-w-0">{title}</span>
          <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none min-[641px]:hidden", open && "rotate-180")} />
        </button>
      </h2>
      <div id={panelId} className={open ? undefined : "max-[640px]:hidden"}>
        {children}
      </div>
    </>
  );
}

function phaseLabel(start: string) {
  const [h, m] = start.split(":").map(Number);
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins < (h || 0) * 60 + (m || 0) ? "soon" : "live";
}

export default function DashboardPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const userName = useAuthStore((s) => s.user?.name) ?? "";
  const showMoney = canSeeMoney(role);
  const branches = useLiveQuery(() => db.branches.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const sessions = useLiveQuery(() => db.classes.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const payments = useLiveQuery(() => db.payments.toArray());
  const receivables = useLiveQuery(() => db.installments.toArray());
  const attendance = useLiveQuery(() => db.attendance.toArray());
  const holds = useLiveQuery(() => db.holds.toArray());
  const leads = useLiveQuery(() => db.leads.toArray());
  const classStudents = useLiveQuery(() => db.classStudents.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const audits = useLiveQuery(() => Promise.resolve([] as { id: string; day: string; text: string; sessionId?: string }[]), []) ?? []
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const { branchId } = useStudioBranch();
  const [homeQ, setHomeQ] = useState("");
  const router = useRouter();

  const ready = Boolean(
    branches && students && sessions && courses && classes && rooms && users && payments && receivables && attendance && holds && leads && classStudents && audits,
  );

  const model = useMemo(() => {
    if (!branches || !students || !sessions || !courses || !classes || !rooms || !users || !payments || !receivables || !attendance || !holds || !leads || !classStudents || !audits) {
      return null;
    }
    const today = localDayKey();
    const month = today.slice(0, 7);
    const inBranch = (id: string) => branchId === "all" || id === branchId;
    const branchStudents = students.filter((s) => inBranch(s.branchId));
    const branchSessions = sessions.filter((s) => inBranch(s.branchId));
    const branchCourses = courses.filter((c) => inBranch(c.branchId));
    const active = branchStudents.filter((s) => s.status === "active");
    const joined = (prefix: string) => active.filter((s) => s.joinedDay.startsWith(prefix)).length;
    const joinedNow = joined(month);
    const joinedPrev = joined(monthShift(month, -1));
    const studentDelta = joinedNow - joinedPrev;
    const newPct = joinedPrev === 0 ? (joinedNow === 0 ? 0 : 100) : Math.round(((joinedNow - joinedPrev) / joinedPrev) * 100);

    const todaySessions = branchSessions.filter((s) => s.day === today && s.status !== "cancelled");
    const seatedOf = (classId: string) => {
      const fromRoster = classStudents.filter((cs) => cs.classId === classId).length;
      if (fromRoster > 0) return fromRoster;
      const courseId = sessions.find((s) => s.id === classId)?.courseId;
      return courseId ? branchStudents.filter((st) => st.courseId === courseId).length : 0;
    };
    const todayStudentCount = todaySessions.reduce((sum, s) => sum + seatedOf(s.id), 0);

    const rangeOf = (key: Period, shift: 0 | 1) => {
      if (key === "today") return { start: addDays(today, shift === 0 ? 0 : -1), end: addDays(today, shift === 0 ? 0 : -1) };
      if (key === "month") {
        const prefix = shift === 0 ? month : monthShift(month, -1);
        return { start: `${prefix}-01`, end: shift === 0 ? today : `${prefix}-31` };
      }
      const span = key === "d7" ? 7 : 30;
      const end = addDays(today, shift === 0 ? 0 : -span);
      return { start: addDays(end, -(span - 1)), end };
    };
    const inWindow = (day: string, key: Period, shift: 0 | 1) => {
      const w = rangeOf(key, shift);
      return day >= w.start && day <= w.end;
    };
    const paySum = (key: Period, shift: 0 | 1) =>
      payments.filter((p) => inBranch(p.branchId) && inWindow(p.day, key, shift)).reduce((s, p) => s + p.amount, 0);
    const revenue = paySum("month", 0);
    const revenuePrev = paySum("month", 1);
    const revenueTrend = trend(revenue, revenuePrev);

    const debtRows = receivables.filter((r) => inBranch(r.branchId) && debtRemaining(r) > 0);
    const debtStudents = new Set(debtRows.map((r) => r.studentId)).size;
    const debtTotal = debtRows.reduce((s, r) => s + debtRemaining(r), 0);

    const marks = attendance.filter((a) => {
      const student = students.find((s) => s.id === (a.personId));
      return student && inBranch(student.branchId) && inWindow(a.day, "month", 0);
    });
    const prevMarks = attendance.filter((a) => {
      const student = students.find((s) => s.id === (a.personId));
      return student && inBranch(student.branchId) && inWindow(a.day, "month", 1);
    });
    const rateOf = (rows: typeof marks) => {
      if (rows.length === 0) return 0;
      return Math.round((rows.filter((a) => a.status === "present").length / rows.length) * 100);
    };
    const rate = rateOf(marks);
    const prevRate = rateOf(prevMarks);
    const attendSpark = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, -(6 - i));
      const rows = attendance.filter((a) => {
        const student = students.find((s) => s.id === (a.personId));
        return a.day === day && student && inBranch(student.branchId);
      });
      return rateOf(rows);
    });

    const ending7 = branchCourses.filter((c) => c.endDay >= today && c.endDay <= addDays(today, 7));
    const ending3 = branchCourses.filter((c) => c.endDay >= today && c.endDay <= addDays(today, 3));
    const pendingHolds = holds.filter((h) => h.status === "pending" && inBranch(students.find((s) => s.id === h.studentId)?.branchId ?? ""));
    const fullClasses = classes.filter((c) => {
      if (!inBranch(c.branchId)) return false;
      return c.capacity > 0 && seatedOf(c.id) >= c.capacity;
    });
    const needBackup = branchSessions.filter((s) => {
      if (s.day < today || s.status === "cancelled" || s.status === "completed") return false;
      const teacher = users.find((u) => u.id === s.teacherId);
      if (!s.teacherId) return true;
      if (teacher?.teacherStatus === "paused") return true;
      return s.note.toLowerCase().includes("nghỉ");
    });
    const oldDebtStudents = new Set(
      receivables
        .filter((r) => inBranch(r.branchId) && debtRemaining(r) > 0 && r.dueDay <= addDays(today, -7))
        .map((r) => r.studentId),
    );
    const billed = receivables.filter((r) => inBranch(r.branchId)).reduce((s, r) => s + r.amount, 0);
    const debtShare = billed === 0 ? 0 : Math.round((debtTotal / billed) * 100);
    const staleLeads = leads.filter((l) => (l.stage === "new" || l.stage === "contacted") && l.day <= addDays(today, -3));
    const freshLeads = leads.filter((l) => l.stage === "new");

    const chart = YEAR_REVENUE;
    const chartTotal = chart.reduce((s, d) => s + d.amount, 0);

    const funnel = [
      { id: "new", label: t.dash.leadNew, count: leads.filter((l) => l.stage === "new").length },
      { id: "contacted", label: t.status.leadContacted, count: leads.filter((l) => l.stage === "contacted").length },
      { id: "trial", label: t.status.trial, count: leads.filter((l) => l.stage === "trial").length },
      { id: "won", label: t.dash.enrolled, count: leads.filter((l) => l.stage === "won").length },
    ];

    const ranking = [...branchCourses]
      .map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        count: branchStudents.filter((s) => s.courseId === c.id && s.status === "active").length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const activity = [
      ...payments.filter((p) => inBranch(p.branchId)).map((p) => ({
        id: p.id,
        day: p.day,
        text: fill(t.dash.paidFrom, { amount: formatVnd(p.amount), name: students.find((s) => s.id === p.studentId)?.name ?? t.dash.student }),
      })),
      ...attendance
        .filter((a) => inBranch(students.find((s) => s.id === (a.personId))?.branchId ?? ""))
        .map((a) => ({
          id: a.id,
          day: a.day,
          text: fill(t.dash.marked, { name: students.find((s) => s.id === (a.personId))?.name ?? t.dash.student, className: classes.find((c) => c.id === a.classId)?.name ?? "" }),
        })),
      ...holds
        .filter((h) => h.status === "approved" && inBranch(students.find((s) => s.id === h.studentId)?.branchId ?? ""))
        .map((h) => ({
          id: h.id,
          day: h.fromDay,
          text: fill(t.dash.holdApproved, { name: students.find((s) => s.id === h.studentId)?.name ?? t.dash.student }),
        })),
      ...audits.map((a) => ({ id: a.id, day: a.day, text: a.text })),
    ]
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 5);

    const weekStart = addDays(today, -6);
    const lowAttendSessions = branchSessions.filter((s) => {
      if (s.day < weekStart || s.day > today || s.status === "cancelled") return false;
      const marks = attendance.filter((a) => a.classId === s.id && a.subject === "student");
      if (marks.length < 3) return false;
      const present = marks.filter((a) => a.status === "present").length;
      return present / marks.length < 0.7;
    });

    const teacherIds = new Set(users.filter((u) => u.role === "teacher" && (branchId === "all" || u.branchId === branchId || !u.branchId)).map((u) => u.id));
    const busyTeachers = new Set(todaySessions.map((s) => s.teacherId).filter(Boolean));
    const teacherBusy = [...teacherIds].filter((id) => busyTeachers.has(id)).length;
    const teacherFree = Math.max(0, teacherIds.size - teacherBusy);
    const overloaded = [...teacherIds]
      .map((id) => ({
        id,
        name: users.find((u) => u.id === id)?.name ?? "",
        count: todaySessions.filter((s) => s.teacherId === id).length,
      }))
      .filter((row) => row.count >= 3)
      .sort((a, b) => b.count - a.count);

    const usedRooms = new Set(todaySessions.map((s) => s.roomId).filter(Boolean));
    const branchRooms = rooms.filter((r) => inBranch(r.branchId));
    const freeRooms = branchRooms.filter((r) => !usedRooms.has(r.id)).length;

    const branchOf = new Map(students.map((s) => [s.id, s.branchId]));
    const branchRows = branches.map((b) => {
      const revenueB = payments.filter((p) => p.branchId === b.id && p.day.startsWith(month)).reduce((s, p) => s + p.amount, 0);
      const debtB = receivables.filter((r) => r.branchId === b.id).reduce((s, r) => s + debtRemaining(r), 0);
      const marks = attendance.filter((a) => a.subject === "student" && !a.waived && a.day.startsWith(month) && branchOf.get(a.personId) === b.id);
      const present = marks.filter((a) => a.status === "present").length;
      const sessionsB = sessions.filter((s) => s.branchId === b.id && s.day === today && s.status !== "cancelled").length;
      return {
        id: b.id,
        name: b.name,
        revenue: revenueB,
        debt: debtB,
        rate: marks.length === 0 ? 0 : Math.round((present / marks.length) * 100),
        sessions: sessionsB,
      };
    });
    const q = branchId === "all" ? "" : `?branch=${branchId}`;
    const urgent = [
      pendingHolds.length ? { id: "hold", label: t.dash.urgentHold, count: pendingHolds.length, href: "/holds" } : null,
      needBackup.length ? { id: "backup", label: t.dash.urgentBackup, count: needBackup.length, href: `/schedule${q}` } : null,
      fullClasses.length ? { id: "full", label: t.dash.urgentFull, count: fullClasses.length, href: "/classes" } : null,
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));
    const watch = [
      showMoney && oldDebtStudents.size ? { id: "debt", label: t.dash.watchDebt, count: oldDebtStudents.size, href: `/receivables${q}` } : null,
      ending3.length ? { id: "end", label: t.dash.watchEnd, count: ending3.length, href: `/courses${q}` } : null,
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));
    const info = [
      freshLeads.length ? { id: "lead", label: t.dash.infoLead, count: freshLeads.length, href: "/follow-up?stage=new" } : null,
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));
    return {
      today,
      q,
      active: active.length,
      studentDelta,
      newStudents: joinedNow,
      newPct,
      todayClassCount: todaySessions.length,
      todayStudentCount,
      todaySessions,
      seatedOf,
      revenue,
      revenuePrev,
      revenueTrend,
      debtTotal,
      debtStudents,
      debtShare,
      rate,
      prevRate,
      attendSpark,
      ending7: ending7.length,
      lowAttend: lowAttendSessions.length,
      lowAttendSessions,
      overloaded,
      teacherBusy,
      teacherFree,
      freeRooms,
      branchRows,
      groups: [
        urgent.length ? { title: t.dash.urgent, tone: "danger" as const, items: urgent } : null,
        watch.length ? { title: t.dash.watch, tone: "warn" as const, items: watch } : null,
        info.length ? { title: t.dash.info, tone: "neutral" as const, items: info } : null,
      ].filter((x): x is NonNullable<typeof x> => Boolean(x)),
      chart,
      chartTotal,
      chartAvg: Math.round(chartTotal / chart.length),
      funnel,
      staleLeads: staleLeads.length,
      ranking,
      activity,
    };
  }, [branches, students, sessions, courses, classes, rooms, users, payments, receivables, attendance, holds, leads, classStudents, audits, branchId, showMoney, t]);

  const q = branchId === "all" ? "" : `?branch=${branchId}`;

  if (!ready || !model) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-[5px] bg-slate-100" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[5px] bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="h-72 animate-pulse rounded-[5px] bg-slate-100 lg:col-span-3" />
          <div className="h-72 animate-pulse rounded-[5px] bg-slate-100 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const kpis: {
    id?: string;
    label: string;
    value: string;
    hint: string;
    href: string;
    icon: LucideIcon;
    warn?: boolean;
  }[] = [
    {
      label: t.dash.activeStudents,
      value: String(model.active),
      hint: fill(t.dash.vsLast, { n: `${model.studentDelta >= 0 ? "+" : ""}${model.studentDelta}` }),
      href: `/students${q}`,
      icon: Users,
    },
    {
      id: "new",
      label: t.dash.newStudents,
      value: String(model.newStudents),
      hint: fill(t.dash.vsLast, { n: `${model.newPct >= 0 ? "+" : ""}${model.newPct}%` }),
      href: `/students${q}`,
      icon: Users,
    },
    {
      label: t.dash.todaySessions,
      value: String(model.todaySessions.length),
      hint: fill(t.dash.classStudents, { classes: model.todayClassCount, students: model.todayStudentCount }),
      href: `/schedule${q}`,
      icon: CalendarDays,
    },
    {
      label: t.dash.revenueMonth,
      value: showMoney ? formatVnd(model.revenue) : "—",
      hint: showMoney
        ? fill(t.dash.revenueHint, { arrow: model.revenueTrend >= 0 ? "↑" : "↓", pct: Math.abs(model.revenueTrend), prev: formatVnd(model.revenuePrev) })
        : t.common.hiddenTeacher,
      href: showMoney ? `/revenue${q}` : "",
      icon: Wallet,
    },
    {
      id: "debt",
      label: t.dash.debtOpen,
      value: showMoney ? formatVnd(model.debtTotal) : "—",
      hint: showMoney ? fill(t.dash.debtHint, { n: model.debtStudents, share: model.debtShare }) : t.common.hiddenTeacher,
      href: showMoney ? `/receivables${q}` : "",
      icon: AlertTriangle,
      warn: showMoney && model.debtTotal > 0,
    },
    {
      id: "rate",
      label: t.dash.attendRate,
      value: `${model.rate}%`,
      hint: fill(t.dash.attendHint, { arrow: model.rate - model.prevRate >= 0 ? "↑" : "↓", n: Math.abs(model.rate - model.prevRate) }),
      href: `/attendance${q}`,
      icon: Check,
    },
    {
      label: t.dash.endingCourses,
      value: String(model.ending7),
      hint: t.dash.endingHint,
      href: `/courses${q}`,
      icon: Clock,
    },
  ];

  const funnelMax = Math.max(1, ...model.funnel.map((f) => f.count));

  const opsCards: {
    id: string;
    label: string;
    value: string;
    hint: string;
    href: string;
    warn: boolean;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      id: "today",
      label: t.dash.todayClasses,
      value: String(model.todayClassCount),
      hint: fill(t.dash.classStudents, { classes: model.todayClassCount, students: model.todayStudentCount }),
      href: `/schedule${q}`,
      warn: false,
      icon: CalendarDays,
      tone: "bg-violet-100 text-violet-600",
    },
    ...(showMoney
      ? [{
          id: "fees",
          label: t.dash.opsFees,
          value: String(model.debtStudents),
          hint: fill(t.dash.opsFeesHint, { n: model.debtStudents, amount: formatVnd(model.debtTotal) }),
          href: `/collect-fees${q}`,
          warn: model.debtStudents > 0,
          icon: Wallet,
          tone: "bg-amber-100 text-amber-700",
        }]
      : []),
    {
      id: "low",
      label: t.dash.opsLowAttend,
      value: String(model.lowAttend),
      hint: t.dash.opsLowAttendHint,
      href: `/attendance${q}`,
      warn: model.lowAttend > 0,
      icon: AlertTriangle,
      tone: "bg-rose-100 text-rose-600",
    },
    {
      id: "teachers",
      label: t.dash.opsTeachers,
      value: String(model.teacherBusy + model.teacherFree),
      hint: fill(t.dash.opsTeachersHint, { busy: model.teacherBusy, free: model.teacherFree }),
      href: `/teachers${q}`,
      warn: false,
      icon: Users,
      tone: "bg-sky-100 text-sky-600",
    },
  ];

  const iconTone = ["bg-violet-100 text-violet-600", "bg-sky-100 text-sky-600", "bg-rose-100 text-rose-600", "bg-amber-100 text-amber-700"];

  return (
    <div className="flex flex-col gap-4">
      <div className="order-first lg:order-1">
        <h1 className="crm-page-title">
          {userName
            ? fill(
                new Date().getHours() < 12
                  ? t.dash.greetMorning
                  : new Date().getHours() < 18
                    ? t.dash.greetAfternoon
                    : t.dash.greetEvening,
                { name: userName },
              )
            : t.dash.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{settings?.name || "Edu Dance"} · {t.common.sample}</p>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const query = homeQ.trim();
            router.push(query ? `/students?q=${encodeURIComponent(query)}` : "/students");
          }}
        >
          <label className="flex h-12 items-center gap-2 rounded-[5px] bg-[var(--search)] px-4 text-sm text-[var(--muted)]">
            <Search size={18} />
            <input
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none"
              placeholder={t.shell.search}
              value={homeQ}
              onChange={(e) => setHomeQ(e.target.value)}
            />
          </label>
        </form>
      </div>

      <div className="order-2 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.slice(0, 4).map((card, i) => {
          const Icon = card.icon;
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconTone[i] ?? iconTone[0]}`}>
                  <Icon size={16} />
                </span>
              </div>
              <p className={`mt-1 text-xl font-extrabold tabular-nums leading-tight sm:text-[2rem] ${card.warn ? "text-amber-700" : "text-[var(--foreground)]"}`}>{card.value}</p>
              <p className={`mt-1 text-xs tabular-nums ${card.hint.startsWith("↑") || card.hint.startsWith("+") ? "text-green-600" : card.hint.startsWith("↓") || card.hint.startsWith("-") ? "text-rose-600" : "text-slate-400"}`}>{card.hint}</p>
              {card.id === "rate" ? <Spark values={model.attendSpark} /> : null}
              {card.id === "debt" && showMoney ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${model.debtShare}%` }} />
                </div>
              ) : null}
            </>
          );
          const className = "block rounded-[5px] border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-5";
          return card.href ? (
            <Link key={card.label} href={card.href} className={className}>{body}</Link>
          ) : (
            <div key={card.label} className={className}>{body}</div>
          );
        })}
      </div>

      <Link href="/dolphin-ai" className="order-5 block rounded-[5px] bg-[var(--brand-50)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--brand-700)]">{t.shell.askDolphin}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{t.pages.aiLead}</p>
      </Link>

      <section aria-labelledby="ops-strip-heading" className="order-3 space-y-2">
        <h2 id="ops-strip-heading" className="crm-section-title">{t.dash.opsStrip}</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {opsCards.map((card) => {
            const Icon = card.icon;
            return (
            <Link
              key={card.id}
              href={card.href}
              className="rounded-[5px] border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:-translate-y-px hover:border-[var(--brand-100)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon size={16} />
                </span>
              </div>
              <p className={`mt-1 text-xl font-extrabold tabular-nums leading-tight ${card.warn ? "text-amber-700" : "text-[var(--foreground)]"}`}>{card.value}</p>
              <p className="mt-1 text-xs text-slate-400">{card.hint || t.dash.opsNone}</p>
              {card.id === "fees" ? <FeeRemindButton /> : null}
            </Link>
            );
          })}
        </div>
      </section>

      <div className="order-4 grid grid-cols-2 gap-3 lg:order-7">
        {model.branchRows.length > 1 ? (
          <section className="col-span-2 rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-3 sm:p-5" aria-labelledby="home-branches-heading">
            <h2 id="home-branches-heading" className="crm-section-title">{t.dash.branches}</h2>
            <ul className="mt-3 space-y-2 min-[641px]:hidden">
              {model.branchRows.map((row) => (
                <li key={row.id} className={cn("rounded-[5px] border border-[var(--border)] p-3", branchId === row.id && "bg-[var(--brand-50)]")}>
                  <p className="font-bold text-[var(--foreground)]">{row.name}</p>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-slate-500">{t.dash.branchSessions}</dt>
                      <dd className="tabular-nums font-semibold">{row.sessions}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-slate-500">{t.dash.branchRate}</dt>
                      <dd className="tabular-nums font-semibold">{row.rate}%</dd>
                    </div>
                    {showMoney ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-slate-500">{t.dash.branchRevenue}</dt>
                        <dd className="tabular-nums">
                          <Link href={`/revenue?branch=${row.id}`} className="font-semibold text-[var(--brand-600)]">{formatVnd(row.revenue)}</Link>
                        </dd>
                      </div>
                    ) : null}
                    {showMoney ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-slate-500">{t.dash.branchDebt}</dt>
                        <dd className="tabular-nums">
                          <Link href={`/receivables?branch=${row.id}`} className="font-semibold text-[var(--brand-600)]">{formatVnd(row.debt)}</Link>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto min-[641px]:block">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2 font-semibold">{t.common.branch}</th>
                  <th className="py-2 font-semibold">{t.dash.branchSessions}</th>
                  <th className="py-2 font-semibold">{t.dash.branchRate}</th>
                  {showMoney ? <th className="py-2 font-semibold">{t.dash.branchRevenue}</th> : null}
                  {showMoney ? <th className="py-2 font-semibold">{t.dash.branchDebt}</th> : null}
                </tr>
              </thead>
              <tbody>
                {model.branchRows.map((row) => (
                  <tr key={row.id} className={branchId === row.id ? "bg-[var(--brand-50)]" : undefined}>
                    <td className="py-2 font-semibold">{row.name}</td>
                    <td className="py-2 tabular-nums">{row.sessions}</td>
                    <td className="py-2 tabular-nums">{row.rate}%</td>
                    {showMoney ? (
                      <td className="py-2 tabular-nums">
                        <Link href={`/revenue?branch=${row.id}`} className="font-semibold text-[var(--brand-600)]">{formatVnd(row.revenue)}</Link>
                      </td>
                    ) : null}
                    {showMoney ? (
                      <td className="py-2 tabular-nums">
                        <Link href={`/receivables?branch=${row.id}`} className="font-semibold text-[var(--brand-600)]">{formatVnd(row.debt)}</Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>
        ) : null}
        <section className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-3 sm:p-5">
          <h2 className="crm-section-title">{t.dash.workToday}</h2>
          {tasks.filter((tk) => tk.dueDay === model.today && tk.status !== "done" && (branchId === "all" || !tk.branchId || tk.branchId === branchId)).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t.dash.noWork}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tasks
                .filter((tk) => tk.dueDay === model.today && tk.status !== "done" && (branchId === "all" || !tk.branchId || tk.branchId === branchId))
                .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                .map((tk) => (
                  <li key={tk.id}>
                    <Link href="/tasks" className="flex items-center justify-between gap-2 rounded-[5px] px-2 py-2 hover:bg-slate-50">
                      <span className="text-sm">{tk.title}</span>
                      <span className={`rounded-[5px] px-1.5 py-0.5 text-xs font-semibold ${tk.priority === "high" ? "bg-rose-50 text-rose-700" : tk.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {tk.priority === "high" ? t.dash.priHigh : tk.priority === "medium" ? t.dash.priMed : t.dash.priLow}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <section className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-4">
          <MobileFold title={t.dash.freeSlots} panelId="home-free-rooms" titleClassName="crm-section-title">
          {(() => {
            const branchRooms = (rooms ?? []).filter((r) => branchId === "all" || r.branchId === branchId);
            const byStart = new Map<string, Set<string>>();
            for (const s of model.todaySessions) {
              if (!s.roomId) continue;
              const set = byStart.get(s.start) ?? new Set<string>();
              set.add(s.roomId);
              byStart.set(s.start, set);
            }
            const lines = [...byStart.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([start, used]) => ({ start, names: branchRooms.filter((r) => !used.has(r.id)).map((r) => r.name) }))
              .filter((line) => line.names.length > 0);
            if (lines.length === 0) return <p className="mt-3 text-sm text-slate-500">{t.dash.noFree}</p>;
            return (
              <ul className="mt-3 space-y-2 text-sm">
                {lines.map((line) => (
                  <li key={line.start} className="flex justify-between gap-3">
                    <span className="font-semibold tabular-nums">{line.start}</span>
                    <span className="text-right text-slate-600">{line.names.join(", ")}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
          </MobileFold>
        </section>
      </div>

      <div className="order-first grid gap-3 lg:order-4 lg:grid-cols-5">
        <section className="rounded-[5px] border border-slate-200 bg-[var(--card)] p-4 lg:col-span-3" aria-labelledby="home-revenue-heading">
          <MobileFold title={t.dash.revenueYear} headingId="home-revenue-heading" panelId="home-revenue" defaultOpen>
          {showMoney ? (
            <>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.chart} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} tickFormatter={compactVnd} />
                    <Tooltip content={<ChartTip receipts={t.dash.receipts} />} />
                    <Area type="monotone" dataKey="amount" stroke="var(--brand-500)" strokeWidth={2} fill="var(--brand-500)" fillOpacity={0.14} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {t.dash.total} <span className="font-semibold text-slate-800 tabular-nums">{formatVnd(model.chartTotal)}</span>
                {" · "}{t.dash.average} <span className="font-semibold text-slate-800 tabular-nums">{formatVnd(model.chartAvg)}</span>{t.dash.perMonth}
              </p>
            </>
          ) : (
            <p className="mt-6 text-sm text-slate-500">{t.dash.teacherNoRevenue}</p>
          )}
          </MobileFold>
        </section>
        <section className="rounded-[5px] border border-slate-200 bg-[var(--card)] p-4 lg:col-span-2" aria-labelledby="home-funnel-heading">
          <MobileFold title={t.dash.funnel} headingId="home-funnel-heading" panelId="home-funnel">
          <p className="mt-1 text-xs text-slate-400">{t.dash.funnelNote}</p>
          {model.staleLeads > 0 ? (
            <p className="mt-2 rounded-[5px] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {fill(t.dash.stale, { n: model.staleLeads })}
            </p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {model.funnel.map((step, i) => {
              const next = model.funnel[i + 1];
              const conv = next && step.count > 0 ? Math.round((next.count / step.count) * 100) : null;
              return (
                <li key={step.id}>
                  <Link href={`/follow-up?stage=${step.id}`} className="block rounded-[5px] px-1 py-1 hover:bg-slate-50">
                    <div className="flex items-center justify-between text-sm">
                      <span>{step.label}</span>
                      <span className="font-semibold tabular-nums">{step.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: step.count === 0 ? "0%" : `${Math.max(8, (step.count / funnelMax) * 100)}%` }} />
                    </div>
                    {conv !== null ? <p className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">{fill(t.dash.nextStep, { n: conv })}</p> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          </MobileFold>
        </section>
      </div>

      <div className="order-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-[5px] border border-slate-200 bg-[var(--card)] p-5">
          <h2 className="text-base font-semibold">{t.dash.todayClasses}</h2>
          {model.todaySessions.length === 0 ? (
            <div className="mt-6 text-center">
              <CalendarDays className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t.dash.noClassToday}</p>
              <Link href={`/schedule${q}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700">{t.dash.viewSchedule}</Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {model.todaySessions.map((s) => {
                const course = courses?.find((c) => c.id === s.courseId);
                const teacher = users?.find((u) => u.id === s.teacherId);
                const room = rooms?.find((r) => r.id === s.roomId);
                const seated = model.seatedOf(s.id);
                const cap = s.capacity || 12;
                const ratio = cap === 0 ? 0 : seated / cap;
                const bar = ratio >= 0.95 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-[var(--brand-500)]";
                const phase = phaseLabel(s.start);
                return (
                  <li key={s.id} className="rounded-[5px] border border-slate-100 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex gap-2">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: teacher?.avatarColor ?? "#64748B" }}>
                          {initials(teacher?.name ?? "?")}
                        </span>
                        <div>
                          <p className="font-semibold">{s.start} · {course?.name} · {levelLabel(course?.level ?? "")}</p>
                          <p className="text-sm text-slate-500">{teacher?.name} · {room?.name}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{branches?.find((b) => b.id === s.branchId)?.name}</span>
                            <span className={`rounded-[5px] px-2 py-0.5 font-semibold ${phase === "live" ? "bg-green-50 text-[#16A34A]" : "bg-slate-100 text-slate-600"}`}>{phase === "live" ? t.dash.live : t.dash.soon}</span>
                          </p>
                        </div>
                      </div>
                      <Link href={`/attendance?class=${s.id}`} className={ctaOutline}>
                        {t.dash.attend}
                      </Link>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-slate-500">{seated}/{cap}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {model.todaySessions.length > 0 ? (
            <Link href={`/schedule${q}`} className="mt-3 inline-flex text-sm font-semibold text-emerald-700">{t.dash.viewSchedule}</Link>
          ) : null}
        </section>
        <section className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Link href="/tasks" className="inline-flex items-center gap-2 hover:text-[var(--brand-700)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-[var(--brand-50)] text-[var(--brand-600)]">
                <Sparkles size={16} aria-hidden />
              </span>
              {t.dash.tasks}
            </Link>
          </h2>
          {model.groups.length === 0 ? (
            <div className="mt-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <Check />
              </span>
              <p className="mt-3 text-sm font-medium">{t.dash.noTasks}</p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {model.groups.map((group) => (
                <div key={group.title} className={`rounded-[5px] border-l-4 px-2 py-1 ${group.tone === "danger" ? "border-[#DC2626] bg-rose-50/70" : group.tone === "warn" ? "border-[#D97706] bg-amber-50/70" : "border-slate-300 bg-slate-50"}`}>
                  <p className={`text-xs font-semibold uppercase ${group.tone === "danger" ? "text-rose-700" : group.tone === "warn" ? "text-amber-700" : "text-slate-500"}`}>{group.title}</p>
                  <ul className="mt-1 space-y-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className="flex items-center justify-between gap-2 rounded-[5px] px-2 py-2 hover:bg-slate-50">
                          <span className="text-sm">{item.label}</span>
                          <span className="flex items-center gap-2">
                            <span className={`rounded-[5px] px-1.5 py-0.5 text-xs font-semibold tabular-nums ${group.tone === "danger" ? "bg-white text-[#DC2626]" : group.tone === "warn" ? "bg-white text-[#D97706]" : "bg-white text-slate-600"}`}>{item.count}</span>
                            <span className="text-xs font-semibold text-emerald-700">{t.dash.viewAll}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="order-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-base font-semibold">{t.dash.opsLowAttend}</h2>
          {model.lowAttendSessions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t.dash.opsNone}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {model.lowAttendSessions.slice(0, 8).map((s) => {
                const marks = (attendance ?? []).filter((a) => a.classId === s.id && a.subject === "student");
                const present = marks.filter((a) => a.status === "present").length;
                const rate = marks.length === 0 ? 0 : Math.round((present / marks.length) * 100);
                const course = courses?.find((c) => c.id === s.courseId);
                return (
                  <li key={s.id}>
                    <Link href={`/attendance?class=${s.id}`} className="flex items-center justify-between gap-2 rounded-[5px] px-2 py-2 text-sm hover:bg-slate-50">
                      <span className="min-w-0 truncate">{s.day.slice(5)} · {s.start} · {course?.name ?? s.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-rose-600">{rate}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-base font-semibold">{t.dash.overloadTitle}</h2>
          {model.overloaded.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t.dash.noOverload}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {model.overloaded.map((row) => (
                <li key={row.id}>
                  <Link href={`/teachers?teacher=${row.id}`} className="flex items-center justify-between gap-2 rounded-[5px] px-2 py-2 text-sm hover:bg-slate-50">
                    <span className="min-w-0 truncate font-semibold">{row.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-amber-700">{fill(t.dash.overloadLine, { n: row.count })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="order-8 grid items-stretch gap-3 lg:grid-cols-2">
        <section className="h-full rounded-[5px] border border-slate-200 bg-[var(--card)] p-4" aria-labelledby="home-top-courses-heading">
          <MobileFold title={t.dash.topCourses} headingId="home-top-courses-heading" panelId="home-top-courses">
          <ol className="mt-3 space-y-2">
            {model.ranking.length === 0 ? <li className="text-sm text-slate-500">{t.dash.noCourse}</li> : null}
            {model.ranking.map((c, i) => (
              <li key={c.id}>
                <Link href={`/courses${q}`} className="flex items-center justify-between rounded-[5px] px-1 py-1 text-sm hover:bg-slate-50">
                  <span>{i + 1}. {c.name} · {levelLabel(c.level)}</span>
                  <span className="font-semibold tabular-nums">{fill(t.dash.studentCount, { n: c.count })}</span>
                </Link>
              </li>
            ))}
          </ol>
          </MobileFold>
        </section>
        <section className="h-full rounded-[5px] border border-slate-200 bg-[var(--card)] p-4" aria-labelledby="home-activity-heading">
          <MobileFold
            title={<span className="inline-flex items-center gap-2"><LineChart size={16} aria-hidden /> {t.dash.recent}</span>}
            headingId="home-activity-heading"
            panelId="home-activity"
          >
          <ul className="mt-3 space-y-3">
            {model.activity.length === 0 ? <li className="text-sm text-slate-500">{t.dash.noActivity}</li> : null}
            {model.activity.map((a) => (
              <li key={a.id} className="relative border-l border-slate-200 pl-3 text-sm">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--brand-500)]" />
                <p>{a.text}</p>
                <p className="text-xs text-slate-400">{relativeDay(a.day, model.today, { today: t.dash.todayWord, yesterday: t.dash.yesterday, ago: t.dash.daysAgo })}</p>
              </li>
            ))}
          </ul>
          </MobileFold>
        </section>
      </div>
    </div>
  );
}
