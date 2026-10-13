"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Check, Clock, MoreHorizontal, Wallet, X } from "lucide-react";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canApproveHold, canSeeContact, canSeeMoney } from "@/lib/access";
import { addStudentNote, decideHold, moveStudentClass, requestHold, setStudentsFlag, updateStudentProfile } from "@/lib/actions";
import { db } from "@/lib/db";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { attendLabel, holdStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { debtRemaining } from "@/lib/metrics";
import { studentBadges } from "@/lib/student-badges";
import { ageYears, cn, dayFromOffset, formatVnd, initials, isMinor, localDayKey, relativeDayLabel, zaloHref } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const tabIds = ["overview", "courses", "attendance", "money", "hold", "notes"] as const;
type TabId = (typeof tabIds)[number];

export function StudentDrawer({
  studentId,
  onClose,
  variant = "drawer",
  initialTab = "overview",
}: {
  studentId: string;
  onClose: () => void;
  /** drawer = mobile overlay; panel = Edu-style right column */
  variant?: "drawer" | "panel";
  initialTab?: TabId;
}) {
  const { lang, t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
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
  const [menu, setMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileBirth, setProfileBirth] = useState("");
  const [profileParent, setProfileParent] = useState("");
  const [profileParentPhone, setProfileParentPhone] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function requestClose() {
    if (variant === "panel") {
      onCloseRef.current();
      return;
    }
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onCloseRef.current(), 200);
  }

  useEffect(() => {
    if (variant === "panel") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  useEffect(() => {
    setTab(initialTab === "money" && !seeMoney ? "overview" : initialTab);
    setEditingProfile(false);
    setProfileError("");
  }, [studentId, initialTab, seeMoney]);

  const visibleTabs = tabIds.filter((id) => id !== "money" || seeMoney);
  const show = (id: TabId) => tab === id;
  const tabLabel: Record<TabId, string> = {
    overview: t.drawer.tabOverview,
    courses: t.drawer.tabCourses,
    attendance: t.drawer.tabAttendance,
    money: t.drawer.tabPayments,
    hold: t.drawer.tabHolds,
    notes: t.drawer.tabNotes,
  };
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
        <aside className="flex h-full min-h-[28rem] w-full flex-col rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-slate-500">
          {t.drawer.loading}
        </aside>
      );
    }
    return (
      <div className={cn("fixed inset-0 z-50 flex justify-end", leaving && "pointer-events-none")}>
        <button type="button" className={cn("crm-drawer-backdrop absolute inset-0 bg-slate-900/40", leaving && "is-leaving")} aria-label={t.drawer.close} onClick={requestClose} />
        <aside className="crm-drawer-panel h-full w-full max-w-[34rem] bg-white p-6 text-sm text-slate-500">{t.drawer.loading}</aside>
      </div>
    );
  }
  if (!student) return null;

  const course = courses.find((c) => c.id === student.courseId);
  const pack = packages.find((p) => p.id === student.subscriptionId);
  const branch = branches.find((b) => b.id === student.branchId);
  const teacher = users.find((u) => u.id === course?.teacherId);
  const age = ageYears(student.birthDay);
  const kid = isMinor(student.birthDay);
  const badges = studentBadges(student, holds, seeMoney, lang);
  const currentHold = holds.find((h) => h.status === "approved" || h.status === "pending");
  const canRequestHold = !currentHold && student.status !== "paused";
  const manager = canApproveHold(role);
  const today = localDayKey();
  const nextSession = classes
    .filter((c) => c.courseId === student.courseId && c.day >= today && c.status !== "cancelled")
    .sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start))[0];
  const rosterInClass = student.courseId
    ? allStudents.filter((s) => s.courseId === student.courseId && s.status !== "paused").length
    : 0;

  async function saveNote() {
    await addStudentNote(studentId, note, user?.name ?? "");
    setNote("");
  }

  function startProfileEdit() {
    if (!student) return;
    setProfileName(student.name);
    setProfilePhone(student.phone);
    setProfileEmail(student.email);
    setProfileBirth(student.birthDay);
    setProfileParent(student.parentName);
    setProfileParentPhone(student.parentPhone);
    setProfileError("");
    setEditingProfile(true);
  }

  async function saveProfile() {
    setProfileBusy(true);
    setProfileError("");
    const code = await updateStudentProfile({
      id: studentId,
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      birthDay: profileBirth,
      parentName: profileParent,
      parentPhone: profileParentPhone,
    });
    setProfileBusy(false);
    if (code === "name") {
      setProfileError(t.drawer.errName);
      return;
    }
    if (code === "phone") {
      setProfileError(t.drawer.errPhone);
      return;
    }
    if (code === "parent") {
      setProfileError(t.drawer.errParent);
      return;
    }
    if (code) {
      setProfileError(t.drawer.errSave);
      return;
    }
    setEditingProfile(false);
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
            ? "flex h-full max-h-[calc(100dvh-7rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--card)]"
            : cn("crm-drawer-panel relative flex h-full w-full flex-col overflow-x-hidden bg-[var(--background)] sm:w-[420px] sm:max-w-[420px]", leaving && "is-leaving")
        }
      >
        <header className="shrink-0 bg-white px-5 pt-5 pb-3">
          <div className="flex items-start justify-end">
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--brand-50)]" aria-label={t.drawer.close} onClick={requestClose}>
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ background: student.avatarColor }}>
              {initials(student.name)}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[var(--foreground)]">{student.name}</h2>
            <p className="mt-1 text-xs font-semibold tracking-wide text-slate-400">{student.id}</p>
            {seeContact && phone ? (
              <button type="button" className="mt-1 text-sm font-semibold text-[var(--brand-600)]" onClick={() => void copyPhone()}>
                {copied ? t.students.copied : phone}
              </button>
            ) : null}
            <p className="mt-1 text-sm text-[var(--muted)]">{course?.name ?? t.drawer.noCourse} · {levelLabel(student.level)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {badges.map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
              {student.flagged ? <Badge tone="warn">{t.students.flagged}</Badge> : null}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {seeMoney ? (
              <Link href={`/collect-fees?student=${student.id}`} className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-[5px] bg-[var(--brand-500)] px-3 text-sm font-semibold text-white">
                {t.drawer.collect}
              </Link>
            ) : null}
            <Link href="/mid-course-enroll" className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-[5px] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--foreground)]">
              {t.drawer.enrollMore}
            </Link>
            <div className="relative">
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--border)] bg-white" aria-label={t.drawer.moreActions} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                <MoreHorizontal size={18} />
              </button>
              {menu ? (
                <div className="absolute top-12 right-0 z-20 w-52 rounded-[5px] border border-[var(--border)] bg-[var(--card)] py-1 text-left text-sm">
                  {seeContact && phone ? (
                    <a className="block px-3 py-2 hover:bg-[var(--brand-50)]" href={zaloHref(phone) || "#"} target="_blank" rel="noreferrer">{t.task.zalo}</a>
                  ) : null}
                  {seeContact && kid && student.parentPhone ? (
                    <a className="block px-3 py-2 hover:bg-[var(--brand-50)]" href={zaloHref(student.parentPhone) || "#"} target="_blank" rel="noreferrer">{t.drawer.messageParent}</a>
                  ) : null}
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--brand-50)]" onClick={() => { setTab("hold"); setMenu(false); }}>{t.drawer.requestHold}</button>
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--brand-50)]" onClick={() => { void setStudentsFlag([student.id], !student.flagged); setMenu(false); }}>{t.drawer.toggleFlag}</button>
                  <Link className="block px-3 py-2 hover:bg-[var(--brand-50)]" href={`/students/${student.id}`}>{t.drawer.fullProfile}</Link>
                  <Link className="block px-3 py-2 hover:bg-[var(--brand-50)]" href="/mid-course-enroll">{t.drawer.enrollMore}</Link>
                </div>
              ) : null}
            </div>
          </div>
          <div
            className="crm-x-scroll mt-5 -mb-3 flex gap-2 border-b border-[var(--border)]"
            role="tablist"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = visibleTabs.indexOf(tab);
              const next = e.key === "ArrowRight" ? visibleTabs[i + 1] : visibleTabs[i - 1];
              if (next) setTab(next);
            }}
          >
            {visibleTabs.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "shrink-0 -mb-px whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-semibold text-[var(--foreground)]",
                  tab === id ? "border-[var(--brand-500)]" : "border-transparent",
                )}
              >
                {tabLabel[id]}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div key={tab} className="crm-tab-panel">
          {tab === "overview" ? (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.health}</h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-[5px] border border-[var(--border)] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">{t.students.remain}</p>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Clock size={16} /></span>
                    </div>
                    <p className={`mt-1 text-xl font-extrabold leading-tight tabular-nums ${student.remainingSessions <= 3 ? "text-rose-600" : "text-[var(--foreground)]"}`}>{student.remainingSessions}</p>
                    <p className="mt-1 text-xs text-slate-400">{pack?.name ?? "—"}</p>
                  </div>
                  <div className="rounded-[5px] border border-[var(--border)] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">{t.drawer.attendRate}</p>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600"><Check size={16} /></span>
                    </div>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-[var(--foreground)]">{rate}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                  {seeMoney ? (
                    <div className="rounded-[5px] border border-[var(--border)] bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-slate-500">{t.drawer.outstanding}</p>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Wallet size={16} /></span>
                      </div>
                      <p className="mt-1 text-xl font-extrabold leading-tight tabular-nums text-[var(--foreground)]">{formatVnd(outstanding || student.debt)}</p>
                    </div>
                  ) : null}
                  <div className="rounded-[5px] border border-[var(--border)] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">{t.drawer.nextSession}</p>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><CalendarDays size={16} /></span>
                    </div>
                    <p className="mt-1 text-sm font-extrabold leading-tight text-[var(--foreground)]">{nextSession ? `${nextSession.day} · ${nextSession.start}` : t.drawer.noNext}</p>
                    {nextSession ? <p className="mt-1 text-xs text-slate-400">{course?.name}</p> : null}
                  </div>
                </div>
                {student.remainingSessions <= 3 ? (
                  <Link href="/mid-course-enroll" className="mt-3 inline-flex h-10 items-center rounded-[5px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">{t.drawer.renew}</Link>
                ) : null}
              </section>
              <section className="rounded-[5px] border border-[var(--border)] p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.enrollment}</h3>
                <p className="mt-2 font-semibold">{course?.name ?? t.drawer.noCourse}</p>
                <p className="text-slate-500">{levelLabel(student.level)} · {teacher?.name ?? "—"} · {branch?.name ?? "—"}</p>
                <p className="mt-1 text-slate-500">{t.drawer.package} {pack?.name ?? "—"}</p>
              </section>
              <section className="rounded-[5px] border border-[var(--border)] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.personal}</h3>
                  {seeContact && !editingProfile ? (
                    <button type="button" className="text-sm font-semibold text-[var(--brand-600)]" onClick={startProfileEdit}>
                      {t.drawer.editPersonal}
                    </button>
                  ) : null}
                </div>
                {editingProfile ? (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveProfile();
                    }}
                  >
                    <Field label={t.drawer.fullName}>
                      <input className={inputClass} value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    </Field>
                    <Field label={t.drawer.birthDay}>
                      <input className={inputClass} type="date" value={profileBirth} onChange={(e) => setProfileBirth(e.target.value)} />
                    </Field>
                    <Field label={t.students.phone}>
                      <input className={inputClass} value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} inputMode="tel" />
                    </Field>
                    <Field label={t.drawer.email}>
                      <input className={inputClass} type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                    </Field>
                    <Field label={t.drawer.parentName}>
                      <input className={inputClass} value={profileParent} onChange={(e) => setProfileParent(e.target.value)} />
                      <p className="mt-1 text-xs text-slate-400">{t.drawer.parentRequired}</p>
                    </Field>
                    <Field label={t.drawer.parentPhone}>
                      <input className={inputClass} value={profileParentPhone} onChange={(e) => setProfileParentPhone(e.target.value)} inputMode="tel" />
                    </Field>
                    {profileError ? <p className="text-sm text-rose-600">{profileError}</p> : null}
                    <div className="flex gap-2">
                      <Button type="submit" className="h-10 min-h-10 px-4" disabled={profileBusy}>{t.common.save}</Button>
                      <Button type="button" variant="outline" className="h-10 min-h-10 px-4" onClick={() => { setEditingProfile(false); setProfileError(""); }}>{t.common.cancel}</Button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-xs text-slate-400">{t.drawer.fullName}</dt>
                      <dd className="font-semibold">{student.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">{t.drawer.birthDay}</dt>
                      <dd>{student.birthDay || "—"}{age !== null ? ` · ${fill(t.drawer.ageLine, { n: age })}` : ""}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">{t.students.phone}</dt>
                      <dd className="font-semibold">{seeContact ? student.phone || "—" : t.drawer.phoneHidden}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">{t.drawer.email}</dt>
                      <dd>{seeContact ? student.email || "—" : "—"}</dd>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                      <dt className="text-xs text-slate-400">{t.drawer.parent}{kid ? ` · ${t.drawer.parentRequired}` : ""}</dt>
                      <dd className="font-semibold">{student.parentName || "—"}</dd>
                      <dd className="text-slate-500">{seeContact ? student.parentPhone || "—" : "—"}</dd>
                    </div>
                  </dl>
                )}
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.recent}</h3>
                <ul className="mt-2 space-y-3">
                  {activity.slice(0, 5).length === 0 ? <li className="text-slate-500">{t.drawer.noActivity}</li> : null}
                  {activity.slice(0, 5).map((a) => (
                    <li key={a.id} className="relative border-l border-slate-200 pl-3">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--brand-500)]" />
                      <p>{a.text}</p>
                      <p className="text-xs text-slate-400">{relativeDayLabel(a.day, lang)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {tab === "notes" ? (
            <section className="space-y-3 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.drawer.notes}</h3>
              <ul className="space-y-2">
                {student.notes.length === 0 ? <li className="text-slate-500">{t.drawer.notesEmpty}</li> : null}
                {student.notes.map((n, i) => (
                  <li key={i} className="rounded-[5px] border border-[var(--border)] px-3 py-2">
                    <p>{n.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{n.author || "—"} · {relativeDayLabel(n.day, lang)}</p>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input className={inputClass} placeholder={t.drawer.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="button" onClick={() => void saveNote()} disabled={!note.trim()}>{t.common.save}</Button>
              </div>
            </section>
          ) : null}

          {show("courses") ? (
            <section className="space-y-3 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.courses}</h2> : null}
              <article className="rounded-[5px] border border-[var(--border)] p-3">
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
                    <li key={e.id} className="rounded-[5px] border border-slate-100 px-3 py-2 text-slate-600">
                      <span className="font-medium text-slate-800">{packages.find((p) => p.id === e.planId)?.name ?? "—"}</span>
                      {" · "}{courses.find((c) => c.id === e.courseId)?.name}
                      {" · "}{e.sessions} · {e.day}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/mid-course-enroll" className="inline-flex h-10 items-center rounded-[5px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">{t.drawer.enrollMore}</Link>
              </div>
              <div className="rounded-[5px] border border-[var(--border)] p-3">
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
                <div className="rounded-[5px] bg-slate-50 p-3"><p className="text-slate-500">{t.drawer.paidTotal}</p><p className="text-lg font-bold tabular-nums">{formatVnd(paidTotal)}</p></div>
                <div className="rounded-[5px] bg-amber-50 p-3"><p className="text-amber-800">{t.drawer.outstanding}</p><p className="text-lg font-bold tabular-nums text-amber-800">{formatVnd(outstanding || student.debt)}</p></div>
              </div>
              {enrollments.filter((row) => row.promotionName).map((row) => (
                <p key={row.id} className="text-sm text-slate-600">{t.promo.usedName}: {row.promotionName}</p>
              ))}
              <Link href={`/collect-fees?student=${student.id}`} className="inline-flex h-10 items-center rounded-[5px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">{t.drawer.collect}</Link>
              <div className="overflow-auto rounded-[5px] border border-[var(--border)]">
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
              <p className="rounded-[5px] bg-slate-50 px-3 py-2 text-xs text-slate-600">{t.hold.lead}</p>
              {tab === "overview" ? <h2 className="crm-section-title">{t.drawer.hold}</h2> : null}
              {currentHold ? (
                <article className="rounded-[5px] border border-[var(--border)] p-3">
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
                  {manager && currentHold.status === "pending" && user ? (
                    <div className="mt-3 space-y-2">
                      <input className={inputClass} placeholder={t.hold.rejectReason} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => void decideHold(currentHold.id, "approved", user.role, user.id).then((err) => setHoldMsg(err || t.hold.approve))}>{t.hold.approve}</Button>
                        <Button type="button" variant="outline" onClick={() => void decideHold(currentHold.id, "rejected", user.role, user.id, rejectReason).then((err) => setHoldMsg(err || t.hold.reject))}>{t.hold.reject}</Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ) : (
                <p className="text-slate-500">{t.drawer.noHold}</p>
              )}
              {canRequestHold ? (
                <div className="grid gap-2 rounded-[5px] border border-[var(--border)] bg-slate-50 p-3">
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
          </div>
        </div>
      </aside>
  );

  if (variant === "panel") return shell;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className={cn("crm-drawer-backdrop absolute inset-0 bg-slate-900/40", leaving && "is-leaving")} aria-label={t.drawer.close} onClick={requestClose} />
      {shell}
    </div>
  );
}
