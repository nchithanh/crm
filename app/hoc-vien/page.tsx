"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { studentStatusLabel } from "@/lib/labels";
import { formatVnd, initials } from "@/lib/utils";
import type { StudentStatus } from "@/types";

export default function StudentsPage() {
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [classId, setClassId] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = students.find((s) => s.id === openId) ?? null;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((st) => {
      if (status !== "all" && st.status !== status) return false;
      if (classId !== "all" && st.classId !== classId) return false;
      if (!s) return true;
      return `${st.name} ${st.phone}`.toLowerCase().includes(s);
    });
  }, [students, q, status, classId]);

  return (
    <div>
      <h1 className="text-xl font-bold">Học viên</h1>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className={inputClass} placeholder="Tìm tên hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StudentStatus | "all")}>
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang học</option>
          <option value="trial">Học thử</option>
          <option value="paused">Tạm nghỉ</option>
        </select>
        <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="all">Mọi lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <Card className="mt-4 overflow-auto">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {["Học viên", "Gói", "Buổi còn", "Lớp chính", "Trạng thái", "Nợ", ""].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((st) => {
              const pack = packages.find((p) => p.id === st.packageId);
              const klass = classes.find((c) => c.id === st.classId);
              return (
                <tr key={st.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.avatarColor }}>
                        {initials(st.name)}
                      </span>
                      <span>
                        <span className="block font-semibold">{st.name}</span>
                        <span className="text-xs text-slate-400">{st.phone}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">{pack?.name ?? "—"}</td>
                  <td className="px-3 py-3">{st.remainingSessions}</td>
                  <td className="px-3 py-3">{klass?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge tone={st.status === "active" ? "ok" : st.status === "trial" ? "info" : "warn"}>
                      {studentStatusLabel(st.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{st.debt > 0 ? formatVnd(st.debt) : "—"}</td>
                  <td className="px-3 py-3">
                    <button type="button" className="font-semibold text-emerald-700" onClick={() => setOpenId(st.id)}>
                      Hồ sơ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label="Đóng" onClick={() => setOpenId(null)} />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-white" style={{ background: open.avatarColor }}>
                {initials(open.name)}
              </span>
              <div>
                <h2 className="text-xl font-bold">{open.name}</h2>
                <p className="text-sm text-slate-500">{open.phone}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Gói</dt><dd className="font-semibold">{packages.find((p) => p.id === open.packageId)?.name ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Buổi còn</dt><dd className="font-semibold">{open.remainingSessions}</dd></div>
              <div><dt className="text-slate-500">Lớp</dt><dd className="font-semibold">{classes.find((c) => c.id === open.classId)?.name ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Nợ</dt><dd className="font-semibold">{formatVnd(open.debt)}</dd></div>
            </dl>
            <h3 className="mt-5 text-sm font-semibold">Phụ huynh</h3>
            <p className="mt-1 text-sm text-slate-600">{open.parentName ? `${open.parentName} · ${open.parentPhone}` : "Không lưu phụ huynh."}</p>
            <h3 className="mt-5 text-sm font-semibold">Ghi chú</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {open.notes.length === 0 ? <li className="text-slate-500">Chưa có ghi chú.</li> : null}
              {open.notes.map((n, i) => <li key={i}>{n.day} · {n.text}</li>)}
            </ul>
            <Link href={`/hoc-vien/${open.id}`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">
              Mở hồ sơ đầy đủ
            </Link>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
