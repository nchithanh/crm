"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
import { cancelSession, setAttendance, updateSession } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { conflictLabel } from "@/lib/schedule";
import { initials, roomWithBranch } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { AttendStatus } from "@/types";

export function ClassDrawer({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageCatalog(user?.role);
  const klass = useLiveQuery(() => db.classes.get(classId), [classId]);
  const course = useLiveQuery(() => (klass ? db.courses.get(klass.courseId) : undefined), [klass?.courseId]);
  const teachers = useLiveQuery(() => db.users.where("role").equals("teacher").toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const allClasses = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const roster = useLiveQuery(() => db.classStudents.where("classId").equals(classId).toArray(), [classId]) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.where("classId").equals(classId).toArray(), [classId]) ?? [];

  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!klass) return;
    setTeacherId(klass.teacherId);
    setRoomId(klass.roomId || "");
    setMsg("");
    setCancelReason("");
  }, [klass]);

  const rosterStudents = useMemo(
    () => roster.map((cs) => students.find((s) => s.id === cs.studentId)).filter(Boolean),
    [roster, students],
  );

  const conflict = useMemo(() => {
    if (!klass) return "";
    return conflictLabel(allClasses, {
      id: klass.id,
      day: klass.day,
      start: klass.start,
      end: klass.end,
      teacherId: teacherId || klass.teacherId,
      roomId: roomId || klass.roomId,
    });
  }, [allClasses, klass, teacherId, roomId]);

  if (klass === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
        <aside className="h-full w-full max-w-[34rem] bg-white p-6 text-sm text-slate-500">{t.common.loading}</aside>
      </div>
    );
  }
  if (!klass) return null;

  async function saveMeta() {
    if (!user?.id || !klass) return;
    setBusy(true);
    const err = await updateSession({
      sessionId: klass.id,
      actorId: user.id,
      teacherId: teacherId || undefined,
      roomId: roomId || undefined,
    });
    setBusy(false);
    setMsg(err || "");
  }

  async function doCancel() {
    if (!user?.id || !klass) return;
    setBusy(true);
    await cancelSession(klass.id, user.id, cancelReason);
    setBusy(false);
    onClose();
  }

  async function mark(studentId: string, status: AttendStatus) {
    const code = await setAttendance({ classId, personId: studentId, subject: "student", status });
    setMsg(code === "subscription" ? t.pages.subInvalid : "");
  }

  const branchRooms = rooms.filter((r) => !klass.branchId || r.branchId === klass.branchId);
  const statusTone = klass.status === "cancelled" ? "danger" : klass.status === "completed" ? "neutral" : klass.status === "ongoing" ? "ok" : "info";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.common.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[34rem] flex-col bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.12)]">
        <header className="shrink-0 border-b border-[#E2E8F0] px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {course ? (
                  <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link>
                ) : t.nav.classes}
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-900">#{klass.index} · {klass.day}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{klass.start}–{klass.end}</p>
              <div className="mt-2"><Badge tone={statusTone}>{klass.status}</Badge></div>
            </div>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.common.close} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/classes/${klass.id}`} className="text-sm font-semibold text-[var(--brand-600)] hover:underline">
              {t.common.next} →
            </Link>
            <Link href={`/attendance?class=${klass.id}`} className="inline-flex h-9 items-center rounded-[10px] bg-[var(--brand-500)] px-3 text-sm font-semibold text-white">
              {t.nav.attendShort}
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          {conflict ? (
            <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{conflict}</p>
          ) : null}
          {msg ? <p className="text-rose-700">{msg}</p> : null}

          {canEdit && klass.status !== "cancelled" ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.common.teacher} / {t.common.room}</h3>
              <Field label={t.common.teacher}>
                <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  {teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label={t.common.room}>
                <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="">—</option>
                  {branchRooms.map((r) => <option key={r.id} value={r.id}>{roomWithBranch(r.name, branches.find((b) => b.id === r.branchId)?.name)}</option>)}
                </select>
              </Field>
              <Button type="button" variant="outline" disabled={busy || Boolean(conflict)} onClick={() => void saveMeta()}>
                {t.common.save}
              </Button>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {t.nav.students} ({rosterStudents.length}/{klass.capacity})
            </h3>
            <ul className="mt-2 space-y-2">
              {rosterStudents.length === 0 ? <li className="text-slate-500">{t.schedule.emptyClass}</li> : null}
              {rosterStudents.map((s) => {
                if (!s) return null;
                const markRow = attendance.find((a) => a.subject === "student" && a.personId === s.id);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#E2E8F0] px-3 py-2">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-2 font-semibold text-[var(--brand-600)] hover:underline">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.avatarColor }}>{initials(s.name)}</span>
                      {s.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {markRow ? <Badge tone={markRow.status === "present" ? "ok" : "warn"}>{markRow.status}</Badge> : <Badge tone="neutral">—</Badge>}
                      {canEdit && klass.status !== "cancelled" ? (
                        <>
                          <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => void mark(s.id, "present")}>{t.status.present}</button>
                          <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void mark(s.id, "absent")}>{t.status.absent}</button>
                          <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => void mark(s.id, "excused")}>{t.status.excused}</button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {canEdit && klass.status !== "cancelled" ? (
            <section className="space-y-2 rounded-[10px] border border-rose-100 bg-rose-50/50 p-3">
              <h3 className="text-xs font-semibold tracking-wide text-rose-700 uppercase">{t.status.cancelled}</h3>
              <input className={inputClass} placeholder={t.schedule.cancelReason} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              <Button type="button" variant="outline" disabled={busy} className="border-rose-300 text-rose-700" onClick={() => void doCancel()}>
                {t.schedule.cancel}
              </Button>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
