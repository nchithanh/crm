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
                    <Link href={`/hoc-vien/${st.id}`} className="font-semibold text-emerald-700">Hồ sơ</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
