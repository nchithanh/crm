"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import {
  clearTeacherAbsence,
  markTeacherAbsence,
  suggestBackupTeachers,
} from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { dayFromOffset, initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { TeacherStatus, User } from "@/types";

const tabIds = ["overview", "info", "schedule", "workload", "backup"] as const;
type TabId = (typeof tabIds)[number];

function weekBounds(base = new Date()) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const wd = d.getDay();
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: localDayKey(start), to: localDayKey(end) };
}

function statusTone(status: TeacherStatus): "ok" | "warn" | "neutral" {
  if (status === "active") return "ok";
  if (status === "paused") return "warn";
  return "neutral";
}

export function TeacherDrawer({
  teacherId,
  onClose,
  onEdit,
}: {
  teacherId: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
}) {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const teacher = useLiveQuery(() => db.users.get(teacherId), [teacherId]);
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.where("teacherId").equals(teacherId).toArray(), [teacherId]) ?? [];
  const absences = useLiveQuery(() => db.teacherAbsences.where("teacherId").equals(teacherId).toArray(), [teacherId]) ?? [];
  const [tab, setTab] = useState<TabId>("overview");
  const show = (id: TabId) => tab === "overview" || tab === id;
  const [absenceDay, setAbsenceDay] = useState(dayFromOffset(1));
  const [absenceNote, setAbsenceNote] = useState("");
  const [absenceMsg, setAbsenceMsg] = useState("");
  const [showBackup, setShowBackup] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setTab("overview");
  }, [teacherId]);

  const week = weekBounds();
  const monthKey = localDayKey().slice(0, 7);
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.day >= week.from && s.day <= week.to && s.status !== "cancelled").sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start)),
    [sessions, week.from, week.to],
  );
  const monthCount = sessions.filter((s) => s.day.startsWith(monthKey) && s.status !== "cancelled").length;
  const teachingClasses = classes.filter((c) => c.teacherId === teacherId);
  const needCover = useMemo(() => {
    const days = new Set(absences.map((a) => a.day));
    const paused = (teacher?.teacherStatus ?? "active") === "paused";
    return sessions
      .filter((s) => s.status !== "cancelled" && s.day >= localDayKey() && (days.has(s.day) || paused))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [sessions, absences, teacher?.teacherStatus]);

  useEffect(() => {
    if ((teacher?.teacherStatus ?? "active") === "paused" || needCover.length > 0) {
      setShowBackup(true);
    }
  }, [teacher?.teacherStatus, needCover.length]);

  if (teacher === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
        <aside className="h-full w-full max-w-[34rem] bg-white p-6 text-sm text-slate-500">{t.teachers.loading}</aside>
      </div>
    );
  }
  if (!teacher || teacher.role !== "teacher") return null;

  const status = teacher.teacherStatus ?? "active";
  const branch = branches.find((b) => b.id === teacher.branchId);
  const backups = showBackup ? suggestBackupTeachers(teacher, users, teacher.id) : [];
  const overloaded = weekSessions.length > 10;

  async function saveAbsence() {
    setAbsenceMsg("");
    const code = await markTeacherAbsence({ teacherId, day: absenceDay, note: absenceNote });
    if (code) {
      setAbsenceMsg(t.teachers.needFields);
      return;
    }
    setAbsenceNote("");
    setAbsenceMsg(t.teachers.absenceSaved);
    setShowBackup(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.common.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[34rem] flex-col bg-white shadow-xl">
        <header className="border-b border-[#E2E8F0] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: teacher.avatarColor }}>
              {initials(teacher.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{teacher.name}</h2>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.common.close} onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{teacher.phone}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone={statusTone(status)}>{t.teachers.status[status]}</Badge>
                {branch ? <Badge tone="info">{branch.name}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canEdit && onEdit ? (
              <Button type="button" onClick={() => onEdit(teacher.id)}>{t.catalog.edit}</Button>
            ) : null}
            <Link href="/schedule" className="crm-outline inline-flex h-10 items-center rounded-[10px] border-[1.5px] border-[var(--brand-500)] bg-white px-3.5 text-sm font-semibold text-[var(--brand-500)]">
              {t.teachers.viewSchedule}
            </Link>
            <Button type="button" variant="ghost" onClick={onClose}>{t.common.close}</Button>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist">
            {tabIds.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={tab === id ? "shrink-0 border-b-2 border-[var(--brand-500)] px-2.5 py-2 text-sm font-semibold text-[var(--brand-700)]" : "shrink-0 border-b-2 border-transparent px-2.5 py-2 text-sm text-slate-500"}
              >
                {t.teachers.tabs[id]}
              </button>
            ))}
          </div>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4${tab === "overview" ? " space-y-8" : ""}`}>
          {show("info") ? (
            <section className="space-y-4 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.teachers.tabs.info}</h2> : null}
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-slate-400">{t.catalog.phone}</dt><dd className="font-medium text-slate-800">{teacher.phone}</dd></div>
                <div><dt className="text-slate-400">Email</dt><dd className="font-medium text-slate-800">{teacher.email}</dd></div>
                <div><dt className="text-slate-400">{t.common.branch}</dt><dd className="font-medium text-slate-800">{branch?.name ?? "—"}</dd></div>
                <div><dt className="text-slate-400">{t.common.status}</dt><dd className="font-medium text-slate-800">{t.teachers.status[status]}</dd></div>
              </dl>
              <div>
                <p className="text-slate-400">{t.teachers.styles}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(teacher.styles ?? []).map((s) => <Badge key={s} tone="info">{s}</Badge>)}
                  {(teacher.levels ?? []).map((l) => <Badge key={l}>{levelLabel(l)}</Badge>)}
                  {!teacher.styles?.length && !teacher.levels?.length ? <span className="text-slate-500">—</span> : null}
                </div>
              </div>
              {teacher.note ? (
                <div>
                  <p className="text-slate-400">{t.teachers.note}</p>
                  <p className="mt-1 text-slate-700">{teacher.note}</p>
                </div>
              ) : null}
              <div>
                <p className="text-slate-400">{t.teachers.classes}</p>
                <ul className="mt-1 space-y-1">
                  {teachingClasses.length === 0 ? <li className="text-slate-500">—</li> : null}
                  {teachingClasses.map((c) => (
                    <li key={c.id} className="rounded-[10px] border border-[#E2E8F0] px-3 py-2 font-medium text-slate-800">{c.name}</li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {show("schedule") ? (
            <section className="space-y-2 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.teachers.tabs.schedule}</h2> : null}
              <p className="text-slate-500">{t.teachers.weekSessions}</p>
              {weekSessions.length === 0 ? <p className="text-slate-500">{t.teachers.noSessions}</p> : null}
              {weekSessions.map((s) => {
                const course = courses.find((c) => c.id === s.courseId);
                const room = rooms.find((r) => r.id === s.roomId);
                const b = branches.find((x) => x.id === s.branchId);
                return (
                  <div key={s.id} className="rounded-[10px] border border-[#E2E8F0] px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{course?.name ?? s.courseId}</p>
                    <p className="mt-0.5 text-slate-600">{s.day} · {s.start}–{s.end}</p>
                    <p className="text-xs text-slate-400">{room?.name ?? "—"} · {b?.name ?? "—"} · {fill(t.teachers.capacity, { n: room?.capacity ?? 0 })}</p>
                  </div>
                );
              })}
              <Link href="/schedule" className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-600)] hover:underline">
                {t.teachers.viewSchedule}
              </Link>
            </section>
          ) : null}

          {show("workload") ? (
            <section className="space-y-4 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.teachers.tabs.workload}</h2> : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[10px] border border-[#E2E8F0] p-3">
                  <p className="text-slate-400">{t.teachers.weekLoad}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{weekSessions.length}</p>
                </div>
                <div className="rounded-[10px] border border-[#E2E8F0] p-3">
                  <p className="text-slate-400">{t.teachers.monthLoad}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{monthCount}</p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{t.teachers.weekLoad}</span>
                  <span>{weekSessions.length}/12</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={overloaded ? "h-full bg-rose-500" : "h-full bg-[var(--brand-500)]"}
                    style={{ width: `${Math.min(100, (weekSessions.length / 12) * 100)}%` }}
                  />
                </div>
              </div>
              {overloaded ? <p className="rounded-[10px] bg-rose-50 px-3 py-2 text-rose-700">{t.teachers.overload}</p> : null}
              <p className="text-slate-500">{fill(t.teachers.classCount, { n: teachingClasses.length })}</p>
            </section>
          ) : null}

          {show("backup") ? (
            <section className="space-y-4 text-sm">
              {tab === "overview" ? <h2 className="crm-section-title">{t.teachers.tabs.backup}</h2> : null}
              {canEdit ? (
                <div className="space-y-2 rounded-[10px] border border-[#E2E8F0] p-3">
                  <p className="font-semibold text-slate-800">{t.teachers.markAbsence}</p>
                  <Field label={t.schedule.day}>
                    <input type="date" className={inputClass} value={absenceDay} onChange={(e) => setAbsenceDay(e.target.value)} />
                  </Field>
                  <Field label={t.teachers.note}>
                    <input className={inputClass} value={absenceNote} onChange={(e) => setAbsenceNote(e.target.value)} placeholder={t.teachers.absenceNotePh} />
                  </Field>
                  {absenceMsg ? <p className="text-sm text-slate-600">{absenceMsg}</p> : null}
                  <Button type="button" onClick={() => void saveAbsence()}>{t.teachers.markAbsence}</Button>
                </div>
              ) : null}

              <div>
                <p className="font-semibold text-slate-800">{t.teachers.absences}</p>
                <ul className="mt-2 space-y-2">
                  {absences.length === 0 ? <li className="text-slate-500">{t.teachers.noAbsence}</li> : null}
                  {[...absences].sort((a, b) => a.day.localeCompare(b.day)).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 rounded-[10px] border border-[#E2E8F0] px-3 py-2">
                      <span>
                        <span className="font-medium text-slate-800">{a.day}</span>
                        {a.note ? <span className="mt-0.5 block text-slate-500">{a.note}</span> : null}
                      </span>
                      {canEdit ? (
                        <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void clearTeacherAbsence(a.id)}>
                          {t.teachers.clearAbsence}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{t.teachers.needCover}</p>
                  <Button type="button" variant="outline" onClick={() => setShowBackup(true)}>{t.teachers.findBackup}</Button>
                </div>
                {needCover.length === 0 ? <p className="mt-2 text-slate-500">{t.teachers.noCover}</p> : null}
                <ul className="mt-2 space-y-2">
                  {needCover.map((s) => {
                    const course = courses.find((c) => c.id === s.courseId);
                    return (
                      <li key={s.id} className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="font-medium text-slate-900">{course?.name ?? s.courseId}</p>
                        <p className="text-slate-600">{s.day} · {s.start}–{s.end}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {showBackup ? (
                <div>
                  <p className="font-semibold text-slate-800">{t.teachers.backupList}</p>
                  <ul className="mt-2 space-y-2">
                    {backups.length === 0 ? <li className="text-slate-500">{t.teachers.noBackup}</li> : null}
                    {backups.map((u: User) => (
                      <li key={u.id} className="flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] px-3 py-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: u.avatarColor }}>
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{(u.styles ?? []).join(" · ") || "—"}</span>
                        </span>
                        <span className="text-xs text-slate-500">{u.phone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
