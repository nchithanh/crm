"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { addPackage, enrollStudent } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/utils";

export default function PackagesPage() {
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const enrollments = useLiveQuery(() => db.enrollments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [classId, setClassId] = useState("");

  return (
    <div>
      <h1 className="text-xl font-bold">Gói buổi</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id} className="p-4">
            <p className="text-sm text-slate-500">{p.sessions} buổi</p>
            <h2 className="text-lg font-bold">{p.name}</h2>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatVnd(p.price)}</p>
            <p className="mt-1 text-xs text-slate-400">{p.note}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-4">
        <h2 className="font-semibold">Tạo gói buổi</h2>
        <CreatePackageForm />
      </Card>
      <Card className="mt-4 p-4">
        <h2 className="font-semibold">Ghi danh thêm buổi</h2>
        <p className="mt-1 text-sm text-slate-500">Cộng buổi còn lại và tạo một khoản phải thu bằng giá gói.</p>
        <form
          className="mt-3 grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !packageId || !classId) return;
            void enrollStudent({ studentId, packageId, classId });
          }}
        >
          <Field label="Học viên">
            <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Chọn</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Gói">
            <select className={inputClass} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">Chọn</option>
              {packages.filter((p) => p.kind === "course").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Lớp">
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Chọn</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit">Ghi danh</Button>
          </div>
        </form>
      </Card>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {["Ngày", "Học viên", "Gói", "Lớp", "Buổi"].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...enrollments].sort((a, b) => (a.day < b.day ? 1 : -1)).map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-3">{e.day}</td>
                <td className="px-3 py-3">{students.find((s) => s.id === e.studentId)?.name}</td>
                <td className="px-3 py-3">{packages.find((p) => p.id === e.packageId)?.name}</td>
                <td className="px-3 py-3">{classes.find((c) => c.id === e.classId)?.name}</td>
                <td className="px-3 py-3">{e.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CreatePackageForm() {
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("8");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-3 grid gap-3 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(sessions) || 0;
        const p = Number(price) || 0;
        if (!name.trim() || n <= 0 || p <= 0) return;
        void addPackage({ name, sessions: n, price: p, note }).then(() => {
          setName("");
          setPrice("");
          setNote("");
        });
      }}
    >
      <Field label="Tên gói"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Gói 4 buổi" /></Field>
      <Field label="Số buổi"><input className={inputClass} type="number" value={sessions} onChange={(e) => setSessions(e.target.value)} /></Field>
      <Field label="Học phí"><input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="900000" /></Field>
      <Field label="Ghi chú"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="md:col-span-4">
        <Button type="submit">Lưu gói</Button>
      </div>
    </form>
  );
}
