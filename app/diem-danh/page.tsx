"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card } from "@/components/ui";
import { setAttendance } from "@/lib/actions";
import { db } from "@/lib/db";
import { attendLabel } from "@/lib/labels";
import { localDayKey, weekdayLabel } from "@/lib/utils";
import type { AttendStatus } from "@/types";

const marks: AttendStatus[] = ["present", "absent", "excused"];

export default function AttendancePage() {
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const today = localDayKey();
  const weekday = new Date().getDay();
  const preferred = classes.find((c) => c.weekday === weekday)?.id ?? classes[0]?.id ?? "";
  const [classId, setClassId] = useState("");
  const current = classId || preferred;
  const roster = useMemo(
    () => students.filter((s) => s.classId === current && s.status !== "paused"),
    [students, current],
  );
  const klass = classes.find((c) => c.id === current);

  return (
    <div>
      <h1 className="text-xl font-bold">Điểm danh tay</h1>
      <p className="mt-1 text-sm text-slate-500">
        {klass ? `${weekdayLabel(klass.weekday)} · ${klass.start} · ${today}` : "Chọn lớp"}
      </p>
      <select className="mt-4 min-h-11 w-full max-w-md rounded-[12px] border border-slate-200 px-3" value={current} onChange={(e) => setClassId(e.target.value)}>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {weekdayLabel(c.weekday)} {c.start} · {c.name}
          </option>
        ))}
      </select>
      <ul className="mt-4 space-y-2">
        {roster.map((s) => {
          const row = attendance.find((a) => a.classId === current && a.studentId === s.id && a.day === today);
          return (
            <li key={s.id}>
              <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">Còn {s.remainingSessions} buổi</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  {marks.map((m) => (
                    <Button
                      key={m}
                      className="min-h-12 px-2"
                      variant={row?.status === m ? "primary" : "outline"}
                      onClick={() => void setAttendance({ classId: current, studentId: s.id, day: today, status: m })}
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
      {roster.length === 0 ? <p className="mt-4 text-sm text-slate-500">Lớp này chưa có học viên đang học.</p> : null}
    </div>
  );
}
