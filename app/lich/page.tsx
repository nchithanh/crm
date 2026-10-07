"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { weekdayLabel } from "@/lib/utils";

export default function SchedulePage() {
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const [mode, setMode] = useState<"week" | "list">("week");
  const days = [1, 2, 3, 4, 5, 6, 0];
  const today = new Date().getDay();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Lịch học</h1>
        <div className="flex gap-2">
          <Button variant={mode === "week" ? "primary" : "outline"} onClick={() => setMode("week")}>Tuần</Button>
          <Button variant={mode === "list" ? "primary" : "outline"} onClick={() => setMode("list")}>Danh sách</Button>
        </div>
      </div>
      {mode === "week" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {days.map((d) => (
            <section key={d}>
              <h2 className={d === today ? "mb-2 text-sm font-semibold text-emerald-700" : "mb-2 text-sm font-semibold text-slate-500"}>
                {weekdayLabel(d)}
              </h2>
              <div className="space-y-2">
                {classes.filter((c) => c.weekday === d).map((c) => {
                  const count = students.filter((s) => s.classId === c.id && s.status !== "paused").length;
                  const teacher = users.find((u) => u.id === c.teacherId);
                  return (
                    <Link key={c.id} href={`/lich/${c.id}`} className="block">
                      <Card className="p-3">
                        <p className="text-xs text-slate-400">{c.start}–{c.end}</p>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-slate-500">{teacher?.name} · {c.room}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs">{count}/{c.capacity}</span>
                          <Badge tone={count >= c.capacity ? "warn" : "ok"}>{count >= c.capacity ? "Đầy" : "Còn chỗ"}</Badge>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="mt-4 overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left">
              <tr>
                {["Lớp", "Giáo viên", "Phòng", "Lịch", "Sĩ số", ""].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const count = students.filter((s) => s.classId === c.id && s.status !== "paused").length;
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-medium">{c.name}</td>
                    <td className="px-3 py-3">{users.find((u) => u.id === c.teacherId)?.name}</td>
                    <td className="px-3 py-3">{c.room}</td>
                    <td className="px-3 py-3">{weekdayLabel(c.weekday)} {c.start}</td>
                    <td className="px-3 py-3">{count}/{c.capacity}</td>
                    <td className="px-3 py-3"><Link href={`/lich/${c.id}`} className="font-semibold text-emerald-700">Sĩ số</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
