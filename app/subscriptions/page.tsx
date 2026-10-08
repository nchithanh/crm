"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { addPackage, enrollStudent } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { isSubscriptionValid, needsRenew } from "@/lib/subscription";
import { formatVnd, localDayKey } from "@/lib/utils";

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const plans = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [studentId, setStudentId] = useState("");
  const [planId, setPlanId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [msg, setMsg] = useState("");
  const today = localDayKey();

  const rows = useMemo(
    () => [...subscriptions].sort((a, b) => (a.day < b.day ? 1 : -1)),
    [subscriptions],
  );

  return (
    <div>
      <h1 className="crm-page-title">{t.nav.packages}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.addSessionsLead}</p>

      <section className="mt-6">
        <h2 className="text-base font-bold">{t.pages.subPlans}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-4">
              <p className="text-sm text-slate-500">{p.sessions} {t.pages.sessions} · {p.months} mo</p>
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-600)]">{formatVnd(p.price)}</p>
              <p className="mt-1 text-xs text-slate-400">{p.note}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4 p-4">
          <h3 className="font-semibold">{t.pages.createPackage}</h3>
          <CreatePlanForm />
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-bold">{t.pages.addSessions}</h2>
        <Card className="mt-3 p-4">
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!studentId || !planId || !courseId) return;
              void enrollStudent({ studentId, planId, courseId }).then((code) => {
                setMsg(code || "");
                if (!code) {
                  setStudentId("");
                  setPlanId("");
                  setCourseId("");
                }
              });
            }}
          >
            <Field label={t.common.student}>
              <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">{t.common.choose}</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label={t.pages.pack}>
              <select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">{t.common.choose}</option>
                {plans.filter((p) => p.kind === "course").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t.common.course}>
              <select className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">{t.common.choose}</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <Button className="w-full" type="submit">{t.pages.enroll}</Button>
            </div>
          </form>
          {msg ? <p className="mt-2 text-sm text-rose-700">{msg}</p> : null}
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-bold">{t.pages.subActive}</h2>
        <div className="mt-3 overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {[t.common.student, t.common.course, t.pages.pack, t.pages.fromDay, t.pages.subEnd, t.pages.subLeft, t.common.status].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((sub) => {
                const student = students.find((s) => s.id === sub.studentId);
                const course = courses.find((c) => c.id === sub.courseId);
                const plan = plans.find((p) => p.id === sub.planId);
                const valid = isSubscriptionValid(sub, { day: today, courseId: sub.courseId });
                const renew = needsRenew(sub, today);
                return (
                  <tr key={sub.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      {student ? (
                        <Link href={`/students/${student.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">{student.name}</Link>
                      ) : sub.studentId}
                    </td>
                    <td className="px-3 py-3">
                      {course ? (
                        <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link>
                      ) : sub.courseId}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{plan?.name ?? sub.planId}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.day}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.endDay}</td>
                    <td className="px-3 py-3 tabular-nums">{sub.remainingSessions}</td>
                    <td className="px-3 py-3">
                      {renew || !valid ? (
                        <Badge tone="danger">{t.pages.renew}</Badge>
                      ) : (
                        <Badge tone="ok">{sub.status}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CreatePlanForm() {
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
