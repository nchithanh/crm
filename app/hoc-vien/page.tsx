"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { holdStatusLabel, studentStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { usePageQuery } from "@/lib/page-query";
import { formatVnd, initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Level, StudentStatus } from "@/types";

export default function StudentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [branchId, setBranchId] = useState("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [classId, setClassId] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { branch } = usePageQuery();
  useEffect(() => {
    if (branch) setBranchId(branch);
  }, [branch]);
  const open = students.find((s) => s.id === openId) ?? null;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((st) => {
      if (status !== "all" && st.status !== status) return false;
      if (branchId !== "all" && st.branchId !== branchId) return false;
      if (level !== "all" && st.level !== level) return false;
      if (classId !== "all" && st.classId !== classId) return false;
      if (!s) return true;
      return `${st.name} ${seeContact ? st.phone : ""}`.toLowerCase().includes(s);
    });
  }, [students, q, status, classId, branchId, level, seeContact]);

  return (
    <div>
      <h1 className="text-xl font-bold">Học viên</h1>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <input className={inputClass} placeholder={seeContact ? "Tìm tên hoặc số điện thoại" : "Tìm tên"} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="all">Mọi chi nhánh</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level | "all")}>
          <option value="all">Mọi level</option>
          <option value="begin">Begin</option>
          <option value="inter">Inter</option>
          <option value="advance">Advance</option>
        </select>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StudentStatus | "all")}>
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang học</option>
          <option value="trial">Học thử</option>
          <option value="paused">Tạm nghỉ</option>
        </select>
        <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="all">Mọi lớp</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {["Học viên", "Chi nhánh", "Level", "Lớp", "Buổi còn", seeMoney ? "Nợ" : "Gói", ""].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((st) => {
              const hold = holds.find((h) => h.studentId === st.id && (h.status === "pending" || h.status === "approved"));
              return (
                <tr key={st.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.avatarColor }}>{initials(st.name)}</span>
                      <span>
                        <span className="block font-semibold">{st.name}</span>
                        <span className="text-xs text-slate-400">{seeContact ? st.phone : "Ẩn số điện thoại"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">{branches.find((b) => b.id === st.branchId)?.name}</td>
                  <td className="px-3 py-3">{levelLabel(st.level)}</td>
                  <td className="px-3 py-3">{classes.find((c) => c.id === st.classId)?.name}</td>
                  <td className="px-3 py-3">{st.remainingSessions}</td>
                  <td className="px-3 py-3">
                    {seeMoney ? (st.debt > 0 ? formatVnd(st.debt) : "—") : packages.find((p) => p.id === st.packageId)?.name}
                    {hold ? <Badge tone="warn">{holdStatusLabel(hold.status)}</Badge> : null}
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" className="font-semibold text-emerald-700" onClick={() => setOpenId(st.id)}>Hồ sơ</button>
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
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-white" style={{ background: open.avatarColor }}>{initials(open.name)}</span>
              <div>
                <h2 className="text-xl font-bold">{open.name}</h2>
                <p className="text-sm text-slate-500">{seeContact ? open.phone : "Giáo viên không xem số điện thoại"}</p>
              </div>
            </div>
            <Badge tone="info">{studentStatusLabel(open.status)}</Badge>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Chi nhánh</dt><dd className="font-semibold">{branches.find((b) => b.id === open.branchId)?.name}</dd></div>
              <div><dt className="text-slate-500">Level</dt><dd className="font-semibold">{levelLabel(open.level)}</dd></div>
              <div><dt className="text-slate-500">Lớp</dt><dd className="font-semibold">{classes.find((c) => c.id === open.classId)?.name}</dd></div>
              <div><dt className="text-slate-500">Buổi còn</dt><dd className="font-semibold">{open.remainingSessions}</dd></div>
              {seeMoney ? <div><dt className="text-slate-500">Nợ</dt><dd className="font-semibold">{formatVnd(open.debt)}</dd></div> : null}
              <div><dt className="text-slate-500">Gói</dt><dd className="font-semibold">{packages.find((p) => p.id === open.packageId)?.name}</dd></div>
            </dl>
            {seeContact ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">Phụ huynh</h3>
                <p className="mt-1 text-sm">{open.parentName ? `${open.parentName} · ${open.parentPhone}` : "Không lưu phụ huynh."}</p>
              </>
            ) : null}
            <h3 className="mt-5 text-sm font-semibold">Ghi chú</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {open.notes.length === 0 ? <li className="text-slate-500">Chưa có ghi chú.</li> : null}
              {open.notes.map((n, i) => <li key={i}>{n.day} · {n.text}</li>)}
            </ul>
            <p className="mt-4 text-xs text-slate-400">Học viên và phụ huynh không vào CRM. Yêu cầu gửi qua Zalo.</p>
            {seeContact ? (
              <Link href={`/hoc-vien/${open.id}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">Mở hồ sơ đầy đủ</Link>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
