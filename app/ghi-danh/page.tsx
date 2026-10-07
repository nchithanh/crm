"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { enrollStudent } from "@/lib/actions";
import { db } from "@/lib/db";

export default function MidEnrollPage() {
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [classId, setClassId] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-bold">Ghi danh giữa khóa</h1>
      <p className="mt-1 text-sm text-slate-500">Thêm buổi cho học viên đang học. Công nợ tăng bằng giá gói.</p>
      <Card className="mt-4 p-4">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !packageId || !classId) return;
            void enrollStudent({ studentId, packageId, classId }).then(() => setSaved(true));
          }}
        >
          <Field label="Học viên">
            <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Chọn</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Gói buổi">
            <select className={inputClass} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">Chọn</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Lớp">
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Chọn</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="md:col-span-3">
            <Button type="submit">Ghi danh</Button>
            {saved ? <p className="mt-2 text-sm text-emerald-700">Đã cộng buổi và tạo khoản phải thu.</p> : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
