"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { payReceivable } from "@/lib/actions";
import { db } from "@/lib/db";
import { debtLabel } from "@/lib/labels";
import { debtRemaining, debtStatus } from "@/lib/metrics";
import { formatVnd } from "@/lib/utils";
import type { PayMethod } from "@/types";

export default function DebtsPage() {
  const rows = useLiveQuery(() => db.receivables.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [payId, setPayId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("transfer");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const st = debtStatus(r);
      if (status !== "all" && st !== status) return false;
      const name = students.find((x) => x.id === r.studentId)?.name ?? "";
      if (!s) return true;
      return `${name} ${r.title}`.toLowerCase().includes(s);
    });
  }, [rows, students, q, status]);
  const open = rows.find((r) => r.id === payId);

  return (
    <div>
      <h1 className="text-xl font-bold">Thu tiền & công nợ</h1>
      <p className="mt-1 text-sm text-slate-500">Sổ trên máy. Thu một phần hoặc đủ, trừ đúng số còn lại.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Còn phải thu", formatVnd(rows.reduce((s, r) => s + debtRemaining(r), 0))],
          ["Quá hạn", String(rows.filter((r) => debtStatus(r) === "overdue").length)],
          ["Thu một phần", String(rows.filter((r) => debtStatus(r) === "partial").length)],
          ["Đã thu đủ", String(rows.filter((r) => debtStatus(r) === "paid").length)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className={inputClass} placeholder="Tìm học viên hoặc khoản thu" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Mọi trạng thái</option>
          <option value="unpaid">Chưa thu</option>
          <option value="partial">Thu một phần</option>
          <option value="overdue">Quá hạn</option>
          <option value="paid">Đã thu</option>
        </select>
      </div>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {["Học viên", "Khoản", "Phải thu", "Đã thu", "Còn", "Hạn", "Trạng thái", ""].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const st = debtStatus(r);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium">{students.find((s) => s.id === r.studentId)?.name}</td>
                  <td className="px-3 py-3">{r.title}</td>
                  <td className="px-3 py-3">{formatVnd(r.amount)}</td>
                  <td className="px-3 py-3">{formatVnd(r.paid)}</td>
                  <td className="px-3 py-3">{formatVnd(debtRemaining(r))}</td>
                  <td className="px-3 py-3">{r.dueDay}</td>
                  <td className="px-3 py-3">
                    <Badge tone={st === "paid" ? "ok" : st === "overdue" ? "danger" : st === "partial" ? "info" : "warn"}>
                      {debtLabel(st)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {st === "paid" ? null : (
                      <button className="font-semibold text-emerald-700" onClick={() => { setPayId(r.id); setAmount(String(debtRemaining(r))); }}>
                        Thu
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center">
          <form
            className="w-full max-w-md rounded-t-[12px] bg-white p-4 sm:rounded-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              void payReceivable({ receivableId: open.id, amount: Number(amount) || 0, method }).then(() => setPayId(null));
            }}
          >
            <h2 className="text-lg font-bold">Thu tiền</h2>
            <p className="text-sm text-slate-500">{open.title} · còn {formatVnd(debtRemaining(open))}</p>
            <div className="mt-3 space-y-3">
              <Field label="Số tiền">
                <input className={inputClass} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Hình thức">
                <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                  <option value="transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPayId(null)}>Hủy</Button>
              <Button className="flex-1" type="submit">Ghi sổ</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
