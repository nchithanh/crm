"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card } from "@/components/ui";
import { canApproveHold } from "@/lib/access";
import { decideHold } from "@/lib/actions";
import { db } from "@/lib/db";
import { holdStatusLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";

export default function HoldsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const [message, setMessage] = useState("");
  const manager = canApproveHold(role);

  return (
    <div>
      <h1 className="text-xl font-bold">Bảo lưu</h1>
      <p className="mt-1 text-sm text-slate-500">Xin qua Zalo. Chỉ Quản lý duyệt. Gói từ 3 tháng được miễn phí. Gói ngắn phải mua gói bảo lưu. Học viên vẫn giữ chỗ. Buổi hủy không tính vào thời gian bảo lưu.</p>
      {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      <div className="mt-4 space-y-3">
        {holds.map((h) => {
          const student = students.find((s) => s.id === h.studentId);
          const skipped = sessions.filter((s) => student && s.classId === student.classId && s.status === "cancelled" && s.day >= h.fromDay && s.day <= h.toDay).length;
          return (
            <Card key={h.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{student?.name}</p>
                  <p className="text-sm text-slate-500">{h.fromDay} → {h.toDay} · giữ {h.credits} buổi</p>
                  <p className="text-sm text-slate-600">{h.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {h.needsPackage ? "Cần gói bảo lưu." : "Gói từ 3 tháng, bảo lưu miễn phí."}
                    {skipped > 0 ? ` Trong khoảng này có ${skipped} buổi hủy, không tính.` : ""}
                  </p>
                </div>
                <Badge tone={h.status === "pending" ? "warn" : h.status === "approved" ? "info" : "neutral"}>{holdStatusLabel(h.status)}</Badge>
              </div>
              {manager && h.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void decideHold(h.id, "approved", "owner").then((err) => setMessage(err))}>Duyệt</Button>
                  <Button variant="outline" onClick={() => void decideHold(h.id, "rejected", "owner").then((err) => setMessage(err))}>Từ chối</Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
