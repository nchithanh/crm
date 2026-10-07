"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, inputClass } from "@/components/ui";
import { canApproveHold } from "@/lib/access";
import { decideHold, endHoldEarly } from "@/lib/actions";
import { db } from "@/lib/db";
import { holdStatusLabel } from "@/lib/labels";
import { localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Hold } from "@/types";

type Tab = "pending" | "active" | "expired" | "all";

const tabs: { id: Tab; label: string }[] = [
  { id: "pending", label: "Đang chờ duyệt" },
  { id: "active", label: "Đang bảo lưu" },
  { id: "expired", label: "Đã hết hạn" },
  { id: "all", label: "Tất cả" },
];

function bucket(hold: Hold, today: string): Exclude<Tab, "all"> {
  if (hold.status === "pending") return "pending";
  if (hold.status === "approved" && hold.toDay >= today) return "active";
  return "expired";
}

export default function HoldsPage() {
  const user = useAuthStore((s) => s.user);
  const manager = canApproveHold(user?.role);
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const enrollments = useLiveQuery(() => db.enrollments.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const [tab, setTab] = useState<Tab>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState("");
  const today = localDayKey();
  const open = holds.find((h) => h.id === openId) ?? null;

  const rows = holds
    .filter((h) => tab === "all" || bucket(h, today) === tab)
    .sort((a, b) => b.fromDay.localeCompare(a.fromDay));

  async function approve() {
    if (!open || !user) return;
    const err = await decideHold(open.id, "approved", user.role, user.id);
    setMessage(err);
    if (!err) setTab("active");
  }

  async function reject() {
    if (!open || !user) return;
    const err = await decideHold(open.id, "rejected", user.role, user.id, rejectReason);
    setMessage(err);
    if (!err) {
      setRejectReason("");
      setTab("expired");
    }
  }

  async function finishEarly() {
    if (!open || !user) return;
    const err = await endHoldEarly(open.id, user.role, user.id);
    setMessage(err);
    if (!err) setTab("expired");
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Bảo lưu</h1>
      <p className="mt-1 text-sm text-slate-500">Gói từ 3 tháng được tặng bảo lưu. Gói ngắn hơn phải mua gói bảo lưu lẻ. Buổi còn được đóng băng. Học viên vẫn giữ chỗ. Buổi hủy không tính vào thời gian bảo lưu.</p>
      {message ? <p className="mt-3 rounded-[12px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p> : null}
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "min-h-11 shrink-0 rounded-full bg-[#F97316] px-4 text-sm font-semibold text-white" : "min-h-11 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm"} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4 max-h-[70dvh] overflow-auto rounded-[12px] border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left">
            <tr>
              {["Học viên", "Gói", "Số buổi còn", "Ngày bắt đầu BL", "Ngày kết thúc BL", "Người duyệt", "Trạng thái"].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>Không có phiếu trong tab này.</td></tr> : null}
            {rows.map((h) => {
              const student = students.find((s) => s.id === h.studentId);
              const pack = packages.find((p) => p.id === student?.packageId);
              return (
                <tr key={h.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => { setOpenId(h.id); setMessage(""); setRejectReason(h.rejectReason ?? ""); }}>
                  <td className="px-3 py-3 font-semibold">{student?.name}</td>
                  <td className="px-3 py-3">{pack?.name ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{student?.remainingSessions ?? h.credits}</td>
                  <td className="px-3 py-3">{h.fromDay}</td>
                  <td className="px-3 py-3">{h.toDay}</td>
                  <td className="px-3 py-3">{users.find((u) => u.id === h.approverId)?.name ?? "—"}</td>
                  <td className="px-3 py-3"><Badge tone={h.status === "pending" ? "warn" : h.status === "approved" ? "info" : h.status === "rejected" ? "danger" : "neutral"}>{holdStatusLabel(h.status)}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label="Đóng" onClick={() => setOpenId(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
            {(() => {
              const student = students.find((s) => s.id === open.studentId);
              const pack = packages.find((p) => p.id === student?.packageId);
              const klass = classes.find((c) => c.id === student?.classId);
              const bought = enrollments.some((e) => e.studentId === open.studentId && e.packageId === "phold");
              const gifted = Boolean(pack && pack.months >= 3);
              const skipped = sessions.filter((s) => student && s.classId === student.classId && s.status === "cancelled" && s.day >= open.fromDay && s.day <= open.toDay);
              const living = open.status === "approved" && open.toDay >= today;
              return (
                <>
                  <h2 className="text-xl font-bold">{student?.name}</h2>
                  <p className="text-sm text-slate-500">{pack?.name} · còn {student?.remainingSessions ?? open.credits} buổi</p>
                  <Badge tone={open.status === "pending" ? "warn" : open.status === "approved" ? "info" : "neutral"}>{holdStatusLabel(open.status)}</Badge>
                  <h3 className="mt-4 text-sm font-semibold">Lý do xin bảo lưu</h3>
                  <p className="mt-1 text-sm">{open.reason}</p>
                  <h3 className="mt-4 text-sm font-semibold">Thời gian đề xuất</h3>
                  <p className="mt-1 text-sm">{open.fromDay} → {open.toDay}</p>
                  <h3 className="mt-4 text-sm font-semibold">Kiểm tra luật</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    <li className={gifted ? "text-green-700" : "text-amber-800"}>{gifted ? "Gói từ 3 tháng, được tặng bảo lưu." : "Gói ngắn hơn 3 tháng, phải mua gói bảo lưu lẻ."}</li>
                    {!gifted ? <li className={bought ? "text-green-700" : "text-rose-700"}>{bought ? "Đã mua gói bảo lưu lẻ." : "Chưa mua gói bảo lưu lẻ. Chưa duyệt được."}</li> : null}
                    <li>Buổi còn được đóng băng, không trừ khi điểm danh.</li>
                    <li>Vẫn giữ chỗ tại {klass?.name ?? "lớp hiện tại"}.</li>
                    <li>{skipped.length > 0 ? `${skipped.length} buổi hủy trong khoảng này không tính vào bảo lưu.` : "Không có buổi hủy trong khoảng này."}</li>
                  </ul>
                  {open.rejectReason ? <p className="mt-3 text-sm text-rose-700">Lý do từ chối: {open.rejectReason}</p> : null}
                  {manager && open.status === "pending" ? (
                    <div className="mt-4 space-y-2">
                      <Button className="min-h-12 w-full" onClick={() => void approve()}>Duyệt</Button>
                      <input className={inputClass} placeholder="Lý do từ chối" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <Button className="min-h-12 w-full" variant="outline" onClick={() => void reject()}>Từ chối</Button>
                    </div>
                  ) : null}
                  {manager && living ? <Button className="mt-4 min-h-12 w-full" variant="outline" onClick={() => void finishEarly()}>Kết thúc sớm bảo lưu</Button> : null}
                  {!manager ? <p className="mt-4 text-sm text-slate-500">Chỉ Quản lý duyệt hoặc kết thúc bảo lưu.</p> : null}
                </>
              );
            })()}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
