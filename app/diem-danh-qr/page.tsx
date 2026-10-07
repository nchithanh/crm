"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card } from "@/components/ui";
import { setAttendance } from "@/lib/actions";
import { db } from "@/lib/db";
import { localDayKey, weekdayLabel } from "@/lib/utils";

export default function QrAttendancePage() {
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const weekday = new Date().getDay();
  const preferred = classes.find((c) => c.weekday === weekday)?.id ?? classes[0]?.id ?? "";
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [msg, setMsg] = useState("");
  const current = classId || preferred;
  const klass = classes.find((c) => c.id === current);
  const roster = useMemo(
    () => students.filter((s) => s.classId === current && s.status !== "paused"),
    [students, current],
  );
  const token = klass ? `DOLPHIN-CRM|${klass.id}|${localDayKey()}` : "";
  const cells = useMemo(() => {
    let n = 0;
    for (const ch of token) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
    return Array.from({ length: 49 }, (_, i) => ((n >> (i % 24)) & 1) === 1 || (n + i) % 3 === 0);
  }, [token]);

  return (
    <div>
      <h1 className="text-xl font-bold">Điểm danh QR</h1>
      <p className="mt-1 text-sm text-slate-500">Mã giả lập trên máy, không phải QR ngân hàng hay cổng điểm danh thật.</p>
      <select className="mt-4 min-h-11 w-full max-w-md rounded-[12px] border border-slate-200 px-3" value={current} onChange={(e) => setClassId(e.target.value)}>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{weekdayLabel(c.weekday)} {c.start} · {c.name}</option>
        ))}
      </select>
      {klass ? (
        <Card className="mt-4 max-w-sm p-4">
          <p className="text-sm font-semibold">{klass.name}</p>
          <div className="mt-3 grid w-44 grid-cols-7 gap-0.5 bg-white p-2">
            {cells.map((on, i) => (
              <span key={i} className={on ? "h-4 w-4 bg-slate-900" : "h-4 w-4 bg-white"} />
            ))}
          </div>
          <p className="mt-2 break-all text-xs text-slate-400">{token}</p>
        </Card>
      ) : null}
      <Card className="mt-4 max-w-lg p-4">
        <h2 className="font-semibold">Giả lập quét</h2>
        <select className="mt-3 min-h-11 w-full rounded-[12px] border border-slate-200 px-3" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Chọn học viên trong lớp</option>
          {roster.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Button
          className="mt-3"
          onClick={() => {
            if (!studentId || !current) return;
            void setAttendance({ classId: current, studentId, day: localDayKey(), status: "present" }).then(() => {
              const name = roster.find((s) => s.id === studentId)?.name ?? "";
              setMsg(`${name} đã được ghi có mặt.`);
            });
          }}
        >
          Giả lập quét
        </Button>
        {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
      </Card>
    </div>
  );
}
