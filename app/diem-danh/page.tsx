"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card } from "@/components/ui";
import { canSeeContact } from "@/lib/access";
import { setAttendance } from "@/lib/actions";
import { db } from "@/lib/db";
import { attendLabel } from "@/lib/labels";
import { localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePageQuery } from "@/lib/page-query";
import type { AttendStatus } from "@/types";

const marks: AttendStatus[] = ["present", "absent", "excused"];

export default function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const [classId, setClassId] = useState("");
  const today = localDayKey();
  const { branch, classId: classFromQuery } = usePageQuery();
  useEffect(() => {
    if (classFromQuery) setClassId(classFromQuery);
  }, [classFromQuery]);
  const visibleClasses = classes.filter((c) => !branch || c.branchId === branch);
  const todaySessions = sessions.filter((s) => s.day === today && (!branch || s.branchId === branch));
  const preferred = todaySessions[0]?.classId ?? visibleClasses[0]?.id ?? "";
  const current = classId || preferred;
  const session = sessions.find((s) => s.classId === current && s.day === today);
  const roster = useMemo(() => students.filter((s) => s.classId === current), [students, current]);
  const cancelled = session?.status === "cancelled";

  return (
    <div>
      <h1 className="text-xl font-bold">Điểm danh tay</h1>
      <p className="mt-1 text-sm text-slate-500">Có mặt, vắng và có phép đều trừ 1 buổi. Buổi hủy không trừ. Không học bù.</p>
      <select className="mt-4 min-h-11 w-full max-w-md rounded-[12px] border border-slate-200 px-3" value={current} onChange={(e) => setClassId(e.target.value)}>
        {visibleClasses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {session ? (
        <p className="mt-2 text-sm text-slate-600">Buổi {session.index} · {session.start}–{session.end}{cancelled ? " · đã hủy, không trừ credit" : ""}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Hôm nay lớp này không có buổi. Vẫn có thể ghi nhận nếu cần.</p>
      )}
      <ul className="mt-4 space-y-2">
        {roster.map((s) => {
          const row = attendance.find((a) => a.classId === current && a.studentId === s.id && a.day === today);
          return (
            <li key={s.id}>
              <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">Còn {s.remainingSessions} buổi{seeContact ? ` · ${s.phone}` : ""}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  {marks.map((m) => (
                    <Button
                      key={m}
                      className="min-h-12 px-2"
                      variant={row?.status === m ? "primary" : "outline"}
                      onClick={() => void setAttendance({ classId: current, studentId: s.id, day: today, status: m, sessionId: session?.id })}
                    >
                      {attendLabel(m)}
                    </Button>
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
