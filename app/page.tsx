"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  LineChart,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { debtRemaining } from "@/lib/metrics";
import { levelLabel } from "@/lib/rules";
import { formatVnd, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { LucideIcon } from "lucide-react";

type Period = "today" | "d7" | "d30" | "month";
type ChartSpan = 7 | 30;

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

function relativeDay(day: string, today: string) {
  if (day === today) return "hôm nay";
  if (day === addDays(today, -1)) return "hôm qua";
  const n = Math.round(
    (new Date(`${today}T12:00:00`).getTime() - new Date(`${day}T12:00:00`).getTime()) / 86400000,
  );
  if (Number.isNaN(n)) return day;
  return n > 0 ? `${n} ngày trước` : day;
}

function trend(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const showMoney = canSeeMoney(role);
  const branches = useLiveQuery(() => db.branches.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const payments = useLiveQuery(() => db.payments.toArray());
  const receivables = useLiveQuery(() => db.receivables.toArray());
  const attendance = useLiveQuery(() => db.attendance.toArray());
  const holds = useLiveQuery(() => db.holds.toArray());
  const leads = useLiveQuery(() => db.leads.toArray());
  const audits = useLiveQuery(() => db.audits.toArray());
  const [branchId, setBranchId] = useState("all");
  const [period, setPeriod] = useState<Period>("month");
  const [chartSpan, setChartSpan] = useState<ChartSpan>(30);

  const ready = Boolean(
    branches && students && sessions && courses && classes && rooms && users && payments && receivables && attendance && holds && leads && audits,
  );

  const model = useMemo(() => {
    if (!branches || !students || !sessions || !courses || !classes || !rooms || !users || !payments || !receivables || !attendance || !holds || !leads || !audits) {
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
    const studentDelta = joined(month) - joined(monthShift(month, -1));

    const todaySessions = branchSessions.filter((s) => s.day === today && s.status !== "cancelled");
    const todayStudentCount = todaySessions.reduce(
      (sum, s) => sum + branchStudents.filter((st) => st.classId === s.classId).length,
      0,
    );

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
    const revenue = paySum(period, 0);
    const revenuePrev = paySum(period, 1);
    const revenueTrend = trend(revenue, revenuePrev);

    const debtRows = receivables.filter((r) => inBranch(r.branchId) && debtRemaining(r) > 0);
    const debtStudents = new Set(debtRows.map((r) => r.studentId)).size;
    const debtTotal = debtRows.reduce((s, r) => s + debtRemaining(r), 0);

    const marks = attendance.filter((a) => {
      const student = students.find((s) => s.id === a.studentId);
      return student && inBranch(student.branchId) && inWindow(a.day, period, 0);
    });
    const present = marks.filter((a) => a.status === "present").length;
    const rate = marks.length === 0 ? 0 : Math.round((present / marks.length) * 100);

    const ending7 = branchCourses.filter((c) => c.endDay >= today && c.endDay <= addDays(today, 7));
    const ending3 = branchCourses.filter((c) => c.endDay >= today && c.endDay <= addDays(today, 3));
    const pendingHolds = holds.filter((h) => h.status === "pending" && inBranch(students.find((s) => s.id === h.studentId)?.branchId ?? ""));
    const almostFull = classes.filter((c) => {
      if (!inBranch(c.branchId)) return false;
      const n = students.filter((s) => s.classId === c.id).length;
      return c.capacity > 0 && n / c.capacity >= 0.8;
    });
    const needBackup = branchSessions.filter((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      return s.day >= today && s.status === "upcoming" && course && s.teacherId !== course.teacherId && s.note.toLowerCase().includes("nghỉ");
    });

    const chart = Array.from({ length: chartSpan }, (_, i) => {
      const day = addDays(today, -(chartSpan - 1 - i));
      const amount = payments.filter((p) => p.day === day && inBranch(p.branchId)).reduce((s, p) => s + p.amount, 0);
      return { label: day.slice(5), amount };
    });
    const chartTotal = chart.reduce((s, d) => s + d.amount, 0);

    const funnel = [
      { label: "Lead mới", count: leads.filter((l) => l.stage === "new").length },
      { label: "Đã liên hệ", count: leads.filter((l) => l.stage === "contacted").length },
      { label: "Học thử", count: leads.filter((l) => l.stage === "trial").length },
      { label: "Đã ghi danh", count: leads.filter((l) => l.stage === "won").length },
    ];

    const ranking = [...branchCourses]
      .map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        count: branchStudents.filter((s) => s.courseId === c.id && s.status === "active").length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const activity = [
      ...payments.filter((p) => inBranch(p.branchId)).map((p) => ({
        id: p.id,
        day: p.day,
        text: `Đã thu ${formatVnd(p.amount)} từ ${students.find((s) => s.id === p.studentId)?.name ?? "học viên"}`,
      })),
      ...attendance
        .filter((a) => inBranch(students.find((s) => s.id === a.studentId)?.branchId ?? ""))
        .map((a) => ({
          id: a.id,
          day: a.day,
          text: `${students.find((s) => s.id === a.studentId)?.name ?? "Học viên"} vừa điểm danh lớp ${classes.find((c) => c.id === a.classId)?.name ?? ""}`.trim(),
        })),
      ...holds
        .filter((h) => h.status === "approved" && inBranch(students.find((s) => s.id === h.studentId)?.branchId ?? ""))
        .map((h) => ({
          id: h.id,
          day: h.fromDay,
          text: `Duyệt bảo lưu cho ${students.find((s) => s.id === h.studentId)?.name ?? "học viên"}`,
        })),
      ...audits.map((a) => ({ id: a.id, day: a.day, text: a.text })),
    ]
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 6);

    const q = branchId === "all" ? "" : `?branch=${branchId}`;
    return {
      today,
      q,
      active: active.length,
      studentDelta,
      todayClassCount: new Set(todaySessions.map((s) => s.classId)).size,
      todayStudentCount,
      todaySessions,
      revenue,
      revenueTrend,
      debtTotal,
      debtStudents,
      rate,
      ending7: ending7.length,
      tasks: [
        pendingHolds.length ? { id: "hold", label: "Duyệt bảo lưu đang chờ", count: pendingHolds.length, tone: "warn" as const, href: "/bao-luu" } : null,
        debtStudents && showMoney ? { id: "debt", label: "Học viên đang nợ học phí", count: debtStudents, tone: "danger" as const, href: `/thu-hoc-phi${q}` } : null,
        almostFull.length ? { id: "full", label: "Lớp sắp đầy", count: almostFull.length, tone: "warn" as const, href: "/lop-hoc" } : null,
        needBackup.length ? { id: "backup", label: "Giáo viên nghỉ cần tìm backup", count: needBackup.length, tone: "danger" as const, href: `/lich${q}` } : null,
        ending3.length ? { id: "end", label: "Khóa kết thúc trong 3 ngày", count: ending3.length, tone: "neutral" as const, href: `/khoa-hoc${q}` } : null,
      ].filter((x): x is NonNullable<typeof x> => Boolean(x)),
      chart,
      chartTotal,
      chartAvg: Math.round(chartTotal / chartSpan),
      funnel,
      ranking,
      activity,
    };
  }, [branches, students, sessions, courses, classes, rooms, users, payments, receivables, attendance, holds, leads, audits, branchId, period, chartSpan, showMoney]);

  const q = branchId === "all" ? "" : `?branch=${branchId}`;

  if (!ready || !model) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-[12px] bg-slate-100" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[12px] bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="h-72 animate-pulse rounded-[12px] bg-slate-100 lg:col-span-3" />
          <div className="h-72 animate-pulse rounded-[12px] bg-slate-100 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const kpis: {
    label: string;
    value: string;
    hint: string;
    href: string;
    icon: LucideIcon;
    warn?: boolean;
  }[] = [
    {
      label: "Học viên đang học",
      value: String(model.active),
      hint: `${model.studentDelta >= 0 ? "+" : ""}${model.studentDelta} so với tháng trước`,
      href: `/hoc-vien${q}`,
      icon: Users,
    },
    {
      label: "Buổi học hôm nay",
      value: String(model.todaySessions.length),
      hint: `${model.todayClassCount} lớp · ${model.todayStudentCount} học viên`,
      href: `/lich${q}`,
      icon: CalendarDays,
    },
    {
      label: period === "month" ? "Doanh thu tháng này" : "Doanh thu kỳ này",
      value: showMoney ? formatVnd(model.revenue) : "—",
      hint: showMoney ? `${model.revenueTrend >= 0 ? "↑" : "↓"} ${Math.abs(model.revenueTrend)}% so với kỳ trước` : "Ẩn với giáo viên",
      href: showMoney ? `/doanh-thu${q}` : "",
      icon: Wallet,
    },
    {
      label: "Công nợ chưa thu",
      value: showMoney ? formatVnd(model.debtTotal) : "—",
      hint: showMoney ? `${model.debtStudents} học viên` : "Ẩn với giáo viên",
      href: showMoney ? `/thu-hoc-phi${q}` : "",
      icon: AlertTriangle,
      warn: showMoney && model.debtTotal > 0,
    },
    {
      label: "Tỷ lệ điểm danh",
      value: `${model.rate}%`,
      hint: "Trong khoảng đang chọn",
      href: `/diem-danh${q}`,
      icon: Check,
    },
    {
      label: "Khóa sắp kết thúc",
      value: String(model.ending7),
      hint: "Trong 7 ngày · cần gia hạn",
      href: `/khoa-hoc${q}`,
      icon: Clock,
    },
  ];

  const funnelMax = Math.max(1, ...model.funnel.map((f) => f.count));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tổng quan</h1>
          <p className="mt-1 text-sm text-slate-500">Edu Dance · dữ liệu mẫu</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="min-h-11 rounded-[12px] border border-slate-200 bg-white px-3 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="all">Tất cả chi nhánh</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="min-h-11 rounded-[12px] border border-slate-200 bg-white px-3 text-sm" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="today">Hôm nay</option>
            <option value="d7">7 ngày</option>
            <option value="d30">30 ngày</option>
            <option value="month">Tháng này</option>
          </select>
          <Link href={`/ghi-danh${q}`} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-emerald-500 px-4 text-sm font-semibold">
            <Plus size={16} /> Ghi danh
          </Link>
          {showMoney ? (
            <Link href={`/thu-hoc-phi${q}`} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-emerald-500 px-4 text-sm font-semibold">
              <Plus size={16} /> Thu học phí
            </Link>
          ) : null}
          <Link href={`/diem-danh${q}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold">
            Điểm danh nhanh
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {kpis.map((card) => {
          const Icon = card.icon;
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{card.label}</p>
                <Icon size={16} className="text-slate-400" />
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${card.warn ? "text-amber-700" : ""}`}>{card.value}</p>
              <p className={`mt-1 text-xs tabular-nums ${card.hint.startsWith("↑") ? "text-green-600" : card.hint.startsWith("↓") ? "text-rose-600" : "text-slate-400"}`}>{card.hint}</p>
              {card.label === "Tỷ lệ điểm danh" ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${model.rate}%` }} />
                </div>
              ) : null}
            </>
          );
          const className = "block rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
          return card.href ? (
            <Link key={card.label} href={card.href} className={className}>{body}</Link>
          ) : (
            <div key={card.label} className={className}>{body}</div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Doanh thu {chartSpan} ngày</h2>
            <div className="flex gap-1">
              {([7, 30] as const).map((n) => (
                <button key={n} type="button" className={`min-h-9 rounded-full px-3 text-xs font-semibold ${chartSpan === n ? "bg-emerald-500 text-white" : "border border-slate-200"}`} onClick={() => setChartSpan(n)}>
                  {n} ngày
                </button>
              ))}
            </div>
          </div>
          {showMoney ? (
            <>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={model.chart}>
                    <CartesianGrid stroke="#F1F5F9" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => formatVnd(Number(v))} />
                    <Line type="monotone" dataKey="amount" stroke="#F97316" strokeWidth={2} dot={false} />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Tổng <span className="font-semibold text-slate-800 tabular-nums">{formatVnd(model.chartTotal)}</span>
                {" · "}trung bình <span className="font-semibold text-slate-800 tabular-nums">{formatVnd(model.chartAvg)}</span>/ngày
              </p>
            </>
          ) : (
            <p className="mt-6 text-sm text-slate-500">Giáo viên không xem doanh thu.</p>
          )}
        </section>
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold">Phễu tuyển sinh</h2>
          <p className="mt-1 text-xs text-slate-400">Lead chưa gắn chi nhánh nên phễu là của cả studio.</p>
          <ul className="mt-4 space-y-3">
            {model.funnel.map((step, i) => {
              const next = model.funnel[i + 1];
              const rate = next && step.count > 0 ? Math.round((next.count / step.count) * 100) : null;
              return (
                <li key={step.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="font-semibold tabular-nums">{step.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#F97316]" style={{ width: step.count === 0 ? "0%" : `${Math.max(8, (step.count / funnelMax) * 100)}%` }} />
                  </div>
                  {rate !== null ? <p className="mt-1 text-xs text-slate-400">{rate}% chuyển sang bước sau</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Lớp học hôm nay</h2>
          {model.todaySessions.length === 0 ? (
            <div className="mt-6 text-center">
              <CalendarDays className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Hôm nay không có buổi học.</p>
              <Link href={`/lich${q}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700">Xem toàn bộ lịch</Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {model.todaySessions.map((s) => {
                const course = courses?.find((c) => c.id === s.courseId);
                const seated = students?.filter((st) => st.classId === s.classId).length ?? 0;
                const cap = classes?.find((c) => c.id === s.classId)?.capacity ?? 15;
                const ratio = cap === 0 ? 0 : seated / cap;
                const bar = ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-[#F97316]";
                return (
                  <li key={s.id} className="rounded-[12px] border border-slate-100 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{s.start} · {course?.name} · {levelLabel(course?.level ?? "")}</p>
                        <p className="text-sm text-slate-500">{users?.find((u) => u.id === s.teacherId)?.name}</p>
                        <p className="text-xs text-slate-400">{branches?.find((b) => b.id === s.branchId)?.name} · {rooms?.find((r) => r.id === s.roomId)?.name}</p>
                      </div>
                      <Link href={`/diem-danh?branch=${s.branchId}&class=${s.classId}`} className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-3 text-sm font-semibold">
                        Điểm danh
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
            <Link href={`/lich${q}`} className="mt-3 inline-flex text-sm font-semibold text-emerald-700">Xem toàn bộ lịch</Link>
          ) : null}
        </section>
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Việc cần xử lý</h2>
          {model.tasks.length === 0 ? (
            <div className="mt-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <Check />
              </span>
              <p className="mt-3 text-sm font-medium">Không có việc cần xử lý</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {model.tasks.map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className="flex items-center justify-between gap-2 rounded-[12px] px-2 py-2 hover:bg-slate-50">
                    <span className="text-sm">{t.label}</span>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${t.tone === "danger" ? "bg-rose-50 text-rose-700" : t.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{t.count}</span>
                      <span className="text-xs font-semibold text-emerald-700">Xem</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Top khóa đang chạy</h2>
          <ol className="mt-3 space-y-2">
            {model.ranking.length === 0 ? <li className="text-sm text-slate-500">Chưa có khóa trong chi nhánh này.</li> : null}
            {model.ranking.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span>{i + 1}. {c.name} · {levelLabel(c.level)}</span>
                <span className="font-semibold tabular-nums">{c.count} học viên</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold"><LineChart size={16} /> Hoạt động gần đây</h2>
          <ul className="mt-3 space-y-3">
            {model.activity.length === 0 ? <li className="text-sm text-slate-500">Chưa có hoạt động.</li> : null}
            {model.activity.map((a) => (
              <li key={a.id} className="text-sm">
                <p>{a.text}</p>
                <p className="text-xs text-slate-400">{relativeDay(a.day, model.today)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
