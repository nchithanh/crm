"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { addStudentNote, moveStudentClass, requestHold } from "@/lib/actions";
import { db } from "@/lib/db";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { attendLabel, holdStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { debtRemaining } from "@/lib/metrics";
import { studentBadges } from "@/lib/student-badges";
import { ageYears, dayFromOffset, formatVnd, initials, isMinor, localDayKey, relativeDayLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const tabIds = ["overview", "info", "courses", "attendance", "money", "hold", "activity"] as const;
type TabId = (typeof tabIds)[number];

export function StudentDrawer({
  studentId,
  onClose,
  variant = "drawer",
}: {
  studentId: string;
  onClose: () => void;
  /** drawer = mobile overlay; panel = Edu-style right column */
  variant?: "drawer" | "panel";
}) {
  const { lang, t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const enrollments = useLiveQuery(() => db.subscriptions.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const payments = useLiveQuery(() => db.payments.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const receivables = useLiveQuery(() => db.installments.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const attendance = useLiveQuery(() => db.attendance.where("personId").equals(studentId).filter((a) => a.subject === "student").toArray(), [studentId]) ?? [];
  const allStudents = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const [tab, setTab] = useState<TabId>("overview");
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState("");
  const [moveError, setMoveError] = useState("");
  const [moving, setMoving] = useState(false);
  const [attendClass, setAttendClass] = useState("all");
  const [copied, setCopied] = useState(false);
  const [holdFrom, setHoldFrom] = useState(localDayKey());
  const [holdTo, setHoldTo] = useState(dayFromOffset(14));
  const [holdReason, setHoldReason] = useState("");
  const [holdMsg, setHoldMsg] = useState("");
  const [holdBusy, setHoldBusy] = useState(false);

  useEffect(() => {
    if (variant === "panel") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, variant]);

  useEffect(() => {
    setTab("overview");
  }, [studentId]);

  const visibleTabs = tabIds.filter((id) => id !== "money" || seeMoney);
  const show = (id: TabId) => tab === "overview" || tab === id;
  const marks = useMemo(() => {
    const rows = attendClass === "all" ? attendance : attendance.filter((a) => a.classId === attendClass);
    return [...rows].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 20);
  }, [attendance, attendClass]);
  const counted = attendance.filter((a) => !a.waived);
  const present = counted.filter((a) => a.status === "present").length;
  const rate = counted.length === 0 ? 0 : Math.round((present / counted.length) * 100);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = receivables.reduce((s, r) => s + debtRemaining(r), 0);
  const activity = useMemo(() => {
    if (!student) return [];
    const rows = [
      ...student.notes.map((n, i) => ({ id: `n${i}`, day: n.day, text: `${t.drawer.notes}: ${n.text}` })),
      ...enrollments.map((e) => ({
        id: e.id,
        day: e.day,
        text: `${t.drawer.enrollMore} · ${packages.find((p) => p.id === e.planId)?.name ?? ""} · ${courses.find((c) => c.id === e.courseId)?.name ?? ""} · ${e.sessions}`,
      })),
      ...attendance.map((a) => ({
        id: a.id,
        day: a.day,
        text: fill(t.drawer.marked, { className: classes.find((c) => c.id === a.classId)?.name ?? "", status: attendLabel(a.status, lang) }),
      })),
      ...(seeMoney
        ? payments.map((p) => ({ id: p.id, day: p.day, text: `${t.drawer.collect} ${formatVnd(p.amount)} · ${p.note || (p.method === "transfer" ? t.common.transfer : t.common.cash)}` }))
        : []),
      ...holds.map((h) => ({ id: h.id, day: h.fromDay, text: fill(t.drawer.holdLine, { status: holdStatusLabel(h.status, lang), reason: h.reason }) })),
    ];
    return rows.sort((a, b) => b.day.localeCompare(a.day));
  }, [student, enrollments, attendance, payments, holds, packages, courses, classes, seeMoney, lang, t]);

  if (student === undefined) {
    if (variant === "panel") {
      return (
        <aside className="flex h-full min-h-[28rem] w-full flex-col rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-slate-500">
          {t.drawer.loading}
        </aside>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
        <aside className="h-full w-full max-w-[34rem] bg-white p-6 text-sm text-slate-500">{t.drawer.loading}</aside>
      </div>
    );
  }
  if (!student) return null;

  const course = courses.find((c) => c.id === student.courseId);
  const pack = packages.find((p) => p.id === student.subscriptionId);
  const branch = branches.find((b) => b.id === student.branchId);
  const age = ageYears(student.birthDay);
  const kid = isMinor(student.birthDay);
  const badges = studentBadges(student, holds, seeMoney, lang);
  const currentHold = holds.find((h) => h.status === "approved" || h.status === "pending");
  const canRequestHold = !currentHold && student.status !== "paused";
  const rosterInClass = student.courseId
    ? allStudents.filter((s) => s.courseId === student.courseId && s.status !== "paused").length
    : 0;

  async function saveNote() {
    await addStudentNote(studentId, note);
    setNote("");
  }

  async function changeClass() {
    if (!classId) return;
    setMoving(true);
    const error = await moveStudentClass(studentId, classId);
    setMoveError(error);
    setMoving(false);
    if (!error) setClassId("");
  }

  const phone = student.phone;

  async function copyPhone() {
    if (!seeContact || !phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function submitHold() {
    setHoldBusy(true);
    setHoldMsg("");
    const code = await requestHold({
      studentId,
      fromDay: holdFrom,
      toDay: holdTo,
      reason: holdReason,
    });
    setHoldBusy(false);
    if (code === "fields" || code) {
      setHoldMsg(code === "fields" ? t.drawer.holdError : code);
      return;
    }
    setHoldMsg(t.drawer.holdSent);
    setHoldReason("");
  }

  const shell = (
      <aside
        className={
          variant === "panel"
            ? "flex h-full max-h-[calc(100dvh-8rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
            : "relative flex h-full w-full max-w-[34rem] flex-col bg-white shadow-xl"
        }
      >
        <header className="shrink-0 border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: student.avatarColor }}>
              {initials(student.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{student.name}</h2>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.drawer.close} onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
              {seeContact ? (
                <button type="button" className="mt-0.5 text-left text-sm text-slate-500 hover:text-[var(--brand-600)]" onClick={() => void copyPhone()}>
                  {student.phone || "—"}{copied ? ` · ${t.students.copied}` : ""}
                </button>
              ) : (
                <p className="mt-0.5 text-sm text-slate-400">{t.drawer.phoneHidden}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
                {student.flagged ? <Badge tone="warn">{t.students.flagged}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {seeMoney ? (
              <Link href={`/collect-fees?student=${student.id}`} className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)]">
                {t.drawer.collect}
              </Link>
            ) : null}
            <Link href="/mid-course-enroll" className="crm-outline inline-flex h-10 items-center rounded-[10px] border-[1.5px] border-[var(--brand-500)] bg-white px-3.5 text-sm font-semibold text-[var(--brand-500)]">
              {t.drawer.enrollMore}
            </Link>
            <Button type="button" variant="ghost" onClick={onClose}>{t.drawer.close}</Button>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist">
            {visibleTabs.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={tab === id ? "shrink-0 border-b-2 border-[var(--brand-500)] px-2.5 py-2 text-sm font-semibold text-[var(--brand-700)]" : "shrink-0 border-b-2 border-transparent px-2.5 py-2 text-sm text-slate-500"}
              >
                {t.drawer[id]}
              </button>
            ))}
          </div>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4${tab === "overview" ? " space-y-8" : ""}`}>
          {show("info") ? (
            <section className="space-y-4 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.info}</h2> : null}
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-slate-500">{t.drawer.fullName}</dt><dd className="font-semibold">{student.name}</dd></div>
                <div>
                  <dt className="text-slate-500">{t.students.phone}</dt>
                  <dd className="font-semibold">{seeContact ? student.phone || "—" : "—"}</dd>
                </div>
                <div><dt className="text-slate-500">{t.drawer.email}</dt><dd className="font-semibold">{seeContact ? student.email || "—" : "—"}</dd></div>
                <div><dt className="text-slate-500">{t.drawer.birthDay}</dt><dd className="font-semibold">{student.birthDay || "—"}{age !== null ? ` · ${age}` : ""}</dd></div>
                <div><dt className="text-slate-500">{t.drawer.branch}</dt><dd className="font-semibold">{branch?.name ?? "—"}</dd></div>
                <div><dt className="text-slate-500">{t.drawer.joined}</dt><dd className="font-semibold">{student.joinedDay}</dd></div>
              </dl>
              {(kid || student.parentName) ? (
                <section className="rounded-[12px] bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.parent}</h3>
                  {kid ? <p className="mt-0.5 text-xs text-slate-400">{t.drawer.parentRequired}</p> : null}
                  <p className="mt-1 font-semibold">{student.parentName || "—"}</p>
                  <p className="text-slate-500">{seeContact ? student.parentPhone || "—" : "—"}</p>
                </section>
              ) : null}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.notes}</h3>
                <ul className="mt-2 space-y-2">
                  {student.notes.length === 0 ? <li className="text-slate-500">{t.drawer.notesEmpty}</li> : null}
                  {student.notes.map((n, i) => (
                    <li key={i} className="rounded-[12px] border border-[#E2E8F0] px-3 py-2">
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-slate-400">{relativeDayLabel(n.day, lang)} · {n.day}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input className={inputClass} placeholder={t.drawer.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button type="button" onClick={() => void saveNote()} disabled={!note.trim()}>{t.common.save}</Button>
                </div>
              </section>
            </section>
          ) : null}

          {show("courses") ? (
            <section className="space-y-3 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.courses}</h2> : null}
              <article className="rounded-[12px] border border-[#E2E8F0] p-3">
                <p className="font-semibold text-slate-900">{course?.name ?? t.drawer.noCourse}</p>
                <p className="mt-1 text-slate-500">{levelLabel(student.level)} · {branch?.name}</p>
                <p className="mt-2">
                  {t.drawer.package} {pack?.name ?? "—"} ·{" "}
                  <b className={student.remainingSessions <= 3 ? "text-rose-600" : student.remainingSessions <= 5 ? "text-amber-600" : ""}>
                    {fill(t.drawer.sessionsLeft, { n: student.remainingSessions })}
                  </b>
                </p>
                {course ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {fill(t.drawer.capacity, { n: rosterInClass, cap: course.capacity ?? 12 })}
                  </p>
                ) : null}
              </article>
              {enrollments.length > 0 ? (
                <ul className="space-y-2">
                  {[...enrollments].sort((a, b) => b.day.localeCompare(a.day)).map((e) => (
                    <li key={e.id} className="rounded-[12px] border border-slate-100 px-3 py-2 text-slate-600">
                      <span className="font-medium text-slate-800">{packages.find((p) => p.id === e.planId)?.name ?? "—"}</span>
                      {" · "}{courses.find((c) => c.id === e.courseId)?.name}
                      {" · "}{e.sessions} · {e.day}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/mid-course-enroll" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">{t.drawer.enrollMore}</Link>
              </div>
              <div className="rounded-[12px] border border-[#E2E8F0] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.changeClass}</p>
                <select className={`${inputClass} mt-2`} value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">{t.drawer.pickClass}</option>
                  {classes.filter((c) => c.courseId !== student.courseId && c.status !== "cancelled").map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {branches.find((b) => b.id === c.branchId)?.name}</option>
                  ))}
                </select>
                {moveError ? <p className="mt-2 text-rose-600">{moveError}</p> : null}
                <Button type="button" className="mt-2" variant="outline" disabled={!classId || moving} onClick={() => void changeClass()}>{t.drawer.changeClass}</Button>
              </div>
            </section>
          ) : null}

          {show("attendance") ? (
            <section className="text-sm">
              {tab === "overview" ? <h2 className="crm-section-title mb-2">{t.drawer.attendance}</h2> : null}
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.attendRate}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{rate}%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: `${rate}%` }} />
              </div>
              <p className="mt-1 text-slate-500">{fill(t.drawer.ofSessions, { present, total: counted.length })}</p>
              <Field label={t.drawer.filterCourse}>
                <select className={inputClass} value={attendClass} onChange={(e) => setAttendClass(e.target.value)}>
                  <option value="all">{t.drawer.allCourses}</option>
                  {[...new Set(attendance.map((a) => a.classId))].map((id) => (
                    <option key={id} value={id}>{classes.find((c) => c.id === id)?.name ?? id}</option>
                  ))}
                </select>
              </Field>
              <table className="mt-3 w-full">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-2">{t.drawer.day}</th>
                    <th>{t.drawer.classCol}</th>
                    <th>{t.drawer.statusCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.length === 0 ? <tr><td className="py-2 text-slate-500" colSpan={3}>{t.drawer.noAttend}</td></tr> : null}
                  {marks.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-2 tabular-nums">{a.day}</td>
                      <td>{classes.find((c) => c.id === a.classId)?.name}</td>
                      <td>{attendLabel(a.status, lang)}{a.waived ? ` · ${t.drawer.notDeducted}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {show("money") && seeMoney ? (
            <section className="space-y-3 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.money}</h2> : null}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-slate-50 p-3"><p className="text-slate-500">{t.drawer.paidTotal}</p><p className="text-lg font-bold tabular-nums">{formatVnd(paidTotal)}</p></div>
                <div className="rounded-[12px] bg-amber-50 p-3"><p className="text-amber-800">{t.drawer.outstanding}</p><p className="text-lg font-bold tabular-nums text-amber-800">{formatVnd(outstanding || student.debt)}</p></div>
              </div>
              <Link href={`/collect-fees?student=${student.id}`} className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">{t.drawer.collect}</Link>
              <div className="overflow-auto rounded-[12px] border border-[#E2E8F0]">
                <table className="w-full min-w-[320px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{t.drawer.day}</th>
                      <th className="px-3 py-2 text-right">{t.drawer.amount}</th>
                      <th className="px-3 py-2">{t.drawer.method}</th>
                      <th className="px-3 py-2">{t.drawer.note}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>{t.drawer.noPayments}</td></tr>
                    ) : (
                      [...payments].sort((a, b) => b.day.localeCompare(a.day)).map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 tabular-nums">{p.day}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatVnd(p.amount)}</td>
                          <td className="px-3 py-2">{p.method === "transfer" ? t.common.transfer : t.common.cash}</td>
                          <td className="px-3 py-2 text-slate-500">{p.note || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {show("hold") ? (
            <section className="space-y-3 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.hold}</h2> : null}
              {currentHold ? (
                <article className="rounded-[12px] border border-[#E2E8F0] p-3">
                  <Badge tone={currentHold.status === "approved" ? "warn" : "warn"}>{holdStatusLabel(currentHold.status, lang)}</Badge>
                  <p className="mt-2 font-semibold">{currentHold.fromDay} → {currentHold.toDay}</p>
                  <p className="text-slate-500">{currentHold.reason}</p>
                  <p className="mt-1">{currentHold.credits} · {holdStatusLabel(currentHold.status, lang)}</p>
                  {currentHold.approverId ? (
                    <p className="mt-1 text-xs text-slate-400">
                      {t.drawer.approver}: {users.find((u) => u.id === currentHold.approverId)?.name ?? currentHold.approverId}
                      {currentHold.decidedDay ? ` · ${currentHold.decidedDay}` : ""}
                    </p>
                  ) : null}
                </article>
              ) : (
                <p className="text-slate-500">{t.drawer.noHold}</p>
              )}
              {canRequestHold ? (
                <div className="grid gap-2 rounded-[12px] border border-[#E2E8F0] bg-slate-50 p-3">
                  <Field label={t.drawer.holdFrom}>
                    <input className={inputClass} type="date" value={holdFrom} onChange={(e) => setHoldFrom(e.target.value)} />
                  </Field>
                  <Field label={t.drawer.holdTo}>
                    <input className={inputClass} type="date" value={holdTo} onChange={(e) => setHoldTo(e.target.value)} />
                  </Field>
                  <Field label={t.drawer.holdReason}>
                    <input className={inputClass} value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
                  </Field>
                  {holdMsg ? <p className={`text-sm ${holdMsg === t.drawer.holdSent ? "text-green-700" : "text-rose-700"}`}>{holdMsg}</p> : null}
                  <Button type="button" disabled={holdBusy} onClick={() => void submitHold()}>{t.drawer.requestHold}</Button>
                </div>
              ) : null}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.holdHistory}</h3>
              <ul className="space-y-2">
                {holds.length === 0 ? <li className="text-slate-500">{t.drawer.noHoldHistory}</li> : null}
                {[...holds].sort((a, b) => b.fromDay.localeCompare(a.fromDay)).map((h) => (
                  <li key={h.id} className="border-t border-slate-100 py-2">
                    <p className="font-medium">{h.fromDay} → {h.toDay} · {holdStatusLabel(h.status, lang)}</p>
                    <p className="text-slate-500">{h.reason}</p>
                    {h.approverId ? (
                      <p className="text-xs text-slate-400">{t.drawer.approver}: {users.find((u) => u.id === h.approverId)?.name ?? h.approverId}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {show("activity") ? (
            <section>
              {tab === "overview" ? <h2 className="crm-section-title mb-3">{t.drawer.activity}</h2> : null}
              <ul className="space-y-3 text-sm">
                {activity.length === 0 ? <li className="text-slate-500">{t.drawer.noActivity}</li> : null}
                {activity.map((a) => (
                  <li key={a.id} className="relative border-l border-slate-200 pl-3">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--brand-500)]" />
                    <p>{a.text}</p>
                    <p className="text-xs text-slate-400">{relativeDayLabel(a.day, lang)} · {a.day}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </aside>
  );

  if (variant === "panel") return shell;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.drawer.close} onClick={onClose} />
      {shell}
    </div>
  );
}
