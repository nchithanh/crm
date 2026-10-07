"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Card } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { attendLabel, studentStatusLabel } from "@/lib/labels";
import { formatVnd, initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const tabs = ["Thông tin", "Lịch sử lớp", "Thanh toán", "Ghi chú", "Phụ huynh"] as const;

export default function StudentProfilePage() {
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const { id } = useParams<{ id: string }>();
  const student = useLiveQuery(() => db.students.get(id), [id]);
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const enrollments = useLiveQuery(() => db.enrollments.where("studentId").equals(id).toArray(), [id]) ?? [];
  const payments = useLiveQuery(() => db.payments.where("studentId").equals(id).toArray(), [id]) ?? [];
  const attendance = useLiveQuery(() => db.attendance.where("studentId").equals(id).toArray(), [id]) ?? [];
  const [tab, setTab] = useState<(typeof tabs)[number]>("Thông tin");

  if (student === undefined) return <p className="text-sm text-slate-500">Đang tải…</p>;
  if (!student) return <p>Không thấy học viên.</p>;
  const pack = packages.find((p) => p.id === student.packageId);
  const klass = classes.find((c) => c.id === student.classId);

  return (
    <div>
      <Link href="/hoc-vien" className="text-sm text-slate-500">← Học viên</Link>
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-white" style={{ background: student.avatarColor }}>
          {initials(student.name)}
        </span>
        <div>
          <h1 className="text-xl font-bold">{student.name}</h1>
          <p className="text-sm text-slate-500">{seeContact ? student.phone : "Giáo viên không xem số điện thoại"}</p>
        </div>
        <Badge tone={student.status === "active" ? "ok" : "info"}>{studentStatusLabel(student.status)}</Badge>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto" role="tablist">
        {tabs.filter((t) => (t !== "Thanh toán" || seeMoney) && (t !== "Phụ huynh" || seeContact)).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? "min-h-11 shrink-0 rounded-full bg-emerald-500 px-4 text-sm font-semibold" : "min-h-11 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold"}
          >
            {t}
          </button>
        ))}
      </div>
      <Card className="mt-4 p-4">
        {tab === "Thông tin" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Gói</dt><dd className="font-semibold">{pack?.name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Buổi còn</dt><dd className="font-semibold">{student.remainingSessions}</dd></div>
            <div><dt className="text-slate-500">Lớp chính</dt><dd className="font-semibold">{klass?.name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Nợ</dt><dd className="font-semibold">{formatVnd(student.debt)}</dd></div>
            <div><dt className="text-slate-500">Ngày vào</dt><dd className="font-semibold">{student.joinedDay}</dd></div>
          </dl>
        ) : null}
        {tab === "Lịch sử lớp" ? (
          <div className="space-y-4 text-sm">
            <div>
              <h2 className="font-semibold">Ghi danh</h2>
              <ul className="mt-2 space-y-1">
                {enrollments.map((e) => (
                  <li key={e.id}>
                    {e.day} · {packages.find((p) => p.id === e.packageId)?.name} · {classes.find((c) => c.id === e.classId)?.name} · {e.sessions} buổi
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">Điểm danh</h2>
              <ul className="mt-2 space-y-1">
                {attendance.map((a) => (
                  <li key={a.id}>{a.day} · {classes.find((c) => c.id === a.classId)?.name} · {attendLabel(a.status)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {tab === "Thanh toán" ? (
          <ul className="space-y-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span>{p.day} · {p.note}</span>
                <b>{formatVnd(p.amount)}</b>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "Ghi chú" ? (
          <ul className="space-y-2 text-sm">
            {student.notes.length === 0 ? <li className="text-slate-500">Chưa có ghi chú.</li> : null}
            {student.notes.map((n, i) => (
              <li key={i}><span className="text-slate-400">{n.day}</span> · {n.text}</li>
            ))}
          </ul>
        ) : null}
        {tab === "Phụ huynh" ? (
          student.parentName ? (
            <p className="text-sm">{student.parentName} · {student.parentPhone}</p>
          ) : (
            <p className="text-sm text-slate-500">Học viên tự liên hệ, không lưu phụ huynh.</p>
          )
        ) : null}
      </Card>
    </div>
  );
}
