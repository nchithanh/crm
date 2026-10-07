"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { enrollStudent } from "@/lib/actions";
import { db } from "@/lib/db";
import { canJoinAtSession, levelLabel } from "@/lib/rules";
import { nextJoinSession } from "@/lib/schedule";

export default function MidEnrollPage() {
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.filter((p) => p.kind === "course").toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");

  const course = courses.find((c) => c.classId === classId);
  const next = useMemo(
    () => (course ? nextJoinSession(sessions.filter((s) => s.courseId === course.id)) : null),
    [course, sessions],
  );
  const gate = course && next ? canJoinAtSession(course.level, next.index) : null;

  return (
    <div>
      <h1 className="text-xl font-bold">Ghi danh giữa khóa</h1>
      <p className="mt-1 text-sm text-slate-500">Begin dừng từ buổi 4. Inter chỉ buổi lẻ. Advance chỉ buổi 1 và 5. Không học bù. Học viên vẫn vào lớp khi chưa đóng đủ.</p>
      <Card className="mt-4 p-4">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !packageId || !classId) return;
            void enrollStudent({ studentId, packageId, classId }).then((err) => setMessage(err || "Đã ghi danh và tạo khoản phải thu."));
          }}
        >
          <Field label="Học viên">
            <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Chọn</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Gói tháng">
            <select className={inputClass} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">Chọn</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Lớp theo level">
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Chọn</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {levelLabel(c.level)}</option>)}
            </select>
          </Field>
          {gate ? <p className={`md:col-span-3 text-sm ${gate.ok ? "text-emerald-700" : "text-rose-600"}`}>Buổi kế tiếp: {next?.index}. {gate.reason}</p> : null}
          <div className="md:col-span-3">
            <Button type="submit" disabled={Boolean(gate && !gate.ok)}>Ghi danh</Button>
            {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
