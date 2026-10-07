"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { formatVnd, localDayKey } from "@/lib/utils";

export default function RevenuePage() {
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const month = localDayKey().slice(0, 7);
  const monthRows = payments.filter((p) => p.day.startsWith(month));
  const total = monthRows.reduce((s, p) => s + p.amount, 0);
  const cash = monthRows.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = localDayKey(d);
    return {
      day: key.slice(5),
      amount: payments.filter((p) => p.day === key).reduce((s, p) => s + p.amount, 0),
    };
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Doanh thu</h1>
      <p className="mt-1 text-sm text-slate-500">Tiền đã thu trong dữ liệu mẫu, không phải báo cáo kế toán.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Tháng này</p><p className="mt-2 text-2xl font-bold">{formatVnd(total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Tiền mặt</p><p className="mt-2 text-2xl font-bold">{formatVnd(cash)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Chuyển khoản</p><p className="mt-2 text-2xl font-bold">{formatVnd(total - cash)}</p></Card>
      </div>
      <Card className="mt-4 h-64 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="amount" fill="#F97316" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>{["Ngày", "Học viên", "Số tiền", "Ghi chú"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {[...payments].sort((a, b) => (a.day < b.day ? 1 : -1)).map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-3">{p.day}</td>
                <td className="px-3 py-3">{students.find((s) => s.id === p.studentId)?.name}</td>
                <td className="px-3 py-3">{formatVnd(p.amount)}</td>
                <td className="px-3 py-3">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
