"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { toggleTask } from "@/lib/actions";
import { dashboardNumbers, inLastDays } from "@/lib/metrics";
import { formatVnd, localDayKey } from "@/lib/utils";

export default function DashboardPage() {
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const receivables = useLiveQuery(() => db.receivables.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const today = localDayKey();
  const weekday = new Date().getDay();
  const todayClasses = classes.filter((c) => c.active && c.weekday === weekday);
  const recentMarks = attendance.filter((a) => inLastDays(a.day, 7));
  const present = recentMarks.filter((a) => a.status === "present").length;
  const kpi = dashboardNumbers({
    students,
    leads,
    payments,
    receivables,
    present,
    marked: recentMarks.length,
    todayClasses: todayClasses.length,
  });
  const cards = [
    { label: "Học viên đang học", value: String(kpi.activeStudents) },
    { label: "Lead mới tuần này", value: String(kpi.newLeads) },
    { label: "Lớp hôm nay", value: String(kpi.todayClasses) },
    { label: "Doanh thu tháng", value: formatVnd(kpi.monthlyRevenue) },
    { label: "Công nợ còn", value: formatVnd(kpi.outstanding) },
    { label: "Tỷ lệ có mặt 7 ngày", value: `${kpi.attendanceRate}%` },
  ];
  const funnel = [
    { name: "Lead", value: leads.filter((l) => l.stage === "new" || l.stage === "contacted").length },
    { name: "Học thử", value: leads.filter((l) => l.stage === "trial").length },
    { name: "Ghi danh", value: leads.filter((l) => l.stage === "won").length },
  ];
  const revenue = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = localDayKey(d);
    const amount = payments.filter((p) => p.day === key).reduce((s, p) => s + p.amount, 0);
    return { day: key.slice(5), amount };
  });
  const todayTasks = tasks.filter((t) => t.day === today);

  return (
    <div>
      <h1 className="text-xl font-bold">Tổng quan</h1>
      <p className="mt-1 text-sm text-slate-500">Số liệu lấy từ dữ liệu mẫu trên máy, không phải KPI thật.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Phễu Lead → Học thử → Ghi danh</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Doanh thu 30 ngày</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area dataKey="amount" stroke="#10B981" fill="#10B98133" name="Thu" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Việc hôm nay</h2>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Không có việc gắn với hôm nay.</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) => void toggleTask(t.id, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className={t.done ? "text-slate-400 line-through" : ""}>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Thao tác nhanh</h2>
          <div className="flex flex-col gap-2">
            <Link href="/khach-tiem-nang" className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 px-4 text-sm font-semibold">
              Thêm lead
            </Link>
            <Link href="/diem-danh" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold">
              Điểm danh
            </Link>
            <Link href="/cong-no" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold">
              Ghi nhận thu
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {todayClasses.map((c) => (
              <Badge key={c.id} tone="warn">
                {c.start} {c.name}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
