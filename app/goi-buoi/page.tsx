"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { addPackage, enrollStudent } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatVnd } from "@/lib/utils";

export default function PackagesPage() {
  const { t } = useI18n();
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const enrollments = useLiveQuery(() => db.enrollments.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [classId, setClassId] = useState("");

  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.packages}</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id} className="p-4">
            <p className="text-sm text-slate-500">{p.sessions} {t.pages.sessions}</p>
            <h2 className="text-lg font-bold">{p.name}</h2>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatVnd(p.price)}</p>
            <p className="mt-1 text-xs text-slate-400">{p.note}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-4">
        <h2 className="font-semibold">{t.pages.createPackage}</h2>
        <CreatePackageForm />
      </Card>
      <Card className="mt-4 p-4">
        <h2 className="font-semibold">{t.pages.addSessions}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.pages.addSessionsLead}</p>
        <form
          className="mt-3 grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !packageId || !classId) return;
            void enrollStudent({ studentId, packageId, classId });
          }}
        >
          <Field label={t.common.student}>
            <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{t.common.choose}</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label={t.pages.pack}>
            <select className={inputClass} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">{t.common.choose}</option>
              {packages.filter((p) => p.kind === "course").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t.common.class}>
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{t.common.choose}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit">{t.pages.enroll}</Button>
          </div>
        </form>
      </Card>
      <Card className="mt-4 overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              {[t.money.day, t.common.student, t.pages.pack, t.common.class, t.pages.sessions].map((h) => (
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
  const { t } = useI18n();
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
      <Field label={t.pages.packageName}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t.pages.sessionCount}><input className={inputClass} type="number" value={sessions} onChange={(e) => setSessions(e.target.value)} /></Field>
      <Field label={t.pages.fee}><input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <Field label={t.money.note}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="md:col-span-4">
        <Button type="submit">{t.pages.savePackage}</Button>
      </div>
    </form>
  );
}
