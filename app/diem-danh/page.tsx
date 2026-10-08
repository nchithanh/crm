"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, inputClass } from "@/components/ui";
import { canSeeContact } from "@/lib/access";
import { restoreAttendance, setAttendance } from "@/lib/actions";
import { db } from "@/lib/db";
import { initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import { usePageQuery } from "@/lib/page-query";
import type { Attendance, AttendStatus, Student } from "@/types";

type UndoStep = {
  classId: string;
  studentId: string;
  day: string;
  previous: Attendance | null;
  previousRemaining: number;
};

const buttonTone: Record<AttendStatus, string> = {
  present: "border-[#16A34A] bg-[#16A34A] text-white",
  absent: "border-slate-600 bg-slate-600 text-white",
  excused: "border-[#D97706] bg-[#D97706] text-white",
};

const buttonIdle: Record<AttendStatus, string> = {
  present: "border-[#16A34A] bg-white text-[#16A34A]",
  absent: "border-slate-400 bg-white text-slate-700",
  excused: "border-[#D97706] bg-white text-[#D97706]",
};

function last4(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-4);
}

export default function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const today = localDayKey();
  const { classId: classFromQuery } = usePageQuery();
  const { branchId, setBranchId } = useStudioBranch();
  const [pick, setPick] = useState("");
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<Record<string, AttendStatus>>({});
  const [undo, setUndo] = useState<UndoStep[][]>([]);
  const [summary, setSummary] = useState(false);

  const daySessions = sessions.filter((s) => s.day === today && (branchId === "all" || s.branchId === branchId));
  const branchClasses = classes.filter((c) => branchId === "all" || c.branchId === branchId);
  const idleClasses = branchClasses.filter((c) => !daySessions.some((s) => s.classId === c.id));

  const queryApplied = useRef(false);
  useEffect(() => {
    if (!classFromQuery || queryApplied.current) return;
    if (sessions.length === 0 && classes.length === 0) return;
    queryApplied.current = true;
    const session = sessions.find((s) => s.classId === classFromQuery && s.day === today);
    setPick(session ? session.id : `class:${classFromQuery}`);
  }, [classFromQuery, sessions, classes.length, today]);

  const selectedSession = daySessions.find((s) => s.id === pick);
  const currentClassId = selectedSession?.classId ?? (pick.startsWith("class:") ? pick.slice(6) : daySessions[0]?.classId ?? branchClasses[0]?.id ?? "");
  const session = selectedSession ?? sessions.find((s) => s.classId === currentClassId && s.day === today);
  const klass = classes.find((c) => c.id === currentClassId);
  const cancelled = session?.status === "cancelled";
  const roster = useMemo(() => students.filter((s) => s.classId === currentClassId), [students, currentClassId]);

  function frozen(studentId: string) {
    return holds.some((h) => h.studentId === studentId && h.status === "approved" && h.fromDay <= today && h.toDay >= today);
  }

  const eligible = roster.filter((s) => !frozen(s.id));
  const hiddenHolds = roster.filter((s) => frozen(s.id)).length;
  const visible = eligible.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const marked = eligible.filter((s) => attendance.some((a) => a.classId === currentClassId && a.studentId === s.id && a.day === today));
  const seats = Math.max(0, (klass?.capacity ?? 0) - roster.length);

  function markOf(studentId: string) {
    return attendance.find((a) => a.classId === currentClassId && a.studentId === studentId && a.day === today) ?? null;
  }

  function pulse(studentId: string, status: AttendStatus) {
    setFlash((cur) => ({ ...cur, [studentId]: status }));
    window.setTimeout(() => {
      setFlash((cur) => {
        const next = { ...cur };
        delete next[studentId];
        return next;
      });
    }, 700);
  }

  async function markOne(student: Student, status: AttendStatus) {
    if (frozen(student.id) || !currentClassId) return;
    const step: UndoStep = {
      classId: currentClassId,
      studentId: student.id,
      day: today,
      previous: markOf(student.id),
      previousRemaining: student.remainingSessions,
    };
    await setAttendance({ classId: currentClassId, studentId: student.id, day: today, status, sessionId: session?.id });
    setUndo((stack) => [...stack, [step]]);
    pulse(student.id, status);
  }

  async function markAllPresent() {
    const steps: UndoStep[] = [];
    for (const student of eligible) {
      if (markOf(student.id)?.status === "present") continue;
      steps.push({
        classId: currentClassId,
        studentId: student.id,
        day: today,
        previous: markOf(student.id),
        previousRemaining: student.remainingSessions,
      });
      await setAttendance({ classId: currentClassId, studentId: student.id, day: today, status: "present", sessionId: session?.id });
      pulse(student.id, "present");
    }
    if (steps.length) setUndo((stack) => [...stack, steps]);
  }

  async function undoLast() {
    const batch = undo[undo.length - 1];
    if (!batch) return;
    setUndo((stack) => stack.slice(0, -1));
    for (const step of [...batch].reverse()) await restoreAttendance(step);
  }

  const counts = {
    present: eligible.filter((s) => markOf(s.id)?.status === "present").length,
    absent: eligible.filter((s) => markOf(s.id)?.status === "absent").length,
    excused: eligible.filter((s) => markOf(s.id)?.status === "excused").length,
  };
  const teacher = users.find((u) => u.id === session?.teacherId);
  const room = rooms.find((r) => r.id === session?.roomId);
  const course = courses.find((c) => c.id === session?.courseId);

  return (
    <div className="pb-28">
      <h1 className="text-xl font-bold">Điểm danh tay</h1>
      <p className="mt-2 rounded-[8px] bg-slate-50 px-3 py-1.5 text-xs text-slate-500">Có mặt, vắng và có phép đều trừ 1 buổi. Buổi hủy không trừ. Không học bù.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select className={inputClass} value={branchId} onChange={(e) => { setBranchId(e.target.value); setPick(""); }}>
          <option value="all">Mọi chi nhánh</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={inputClass} value={session ? session.id : currentClassId ? `class:${currentClassId}` : ""} onChange={(e) => setPick(e.target.value)}>
          {daySessions.map((s) => {
            const t = users.find((u) => u.id === s.teacherId);
            const r = rooms.find((roomRow) => roomRow.id === s.roomId);
            const c = courses.find((courseRow) => courseRow.id === s.courseId);
            return <option key={s.id} value={s.id}>{s.start}–{s.end} · {c?.name} · {t?.name} · {r?.name}</option>;
          })}
          {idleClasses.map((c) => <option key={c.id} value={`class:${c.id}`}>{c.name} · không có buổi hôm nay</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{course?.name ?? klass?.name}{teacher ? ` · ${teacher.name}` : ""}{room ? ` · ${room.name}` : ""}</p>
          <p className={`text-3xl font-bold tabular-nums ${seats === 0 ? "text-rose-600" : ""}`}>{seats}</p>
          <p className="text-xs text-slate-500">Chỗ trống · {roster.length}/{klass?.capacity ?? 0}</p>
        </div>
        <input className={`${inputClass} max-w-xs`} placeholder="Tìm tên học viên" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {cancelled ? <p className="mt-3 rounded-[12px] bg-rose-50 px-3 py-2 text-sm text-rose-700">Buổi đã hủy. Ghi nhận không trừ buổi.</p> : null}
      {hiddenHolds > 0 ? <p className="mt-3 rounded-[12px] bg-slate-50 px-3 py-2 text-sm text-slate-600">{hiddenHolds} học viên đang bảo lưu, không có trong danh sách điểm danh. Chỗ trong lớp vẫn giữ.</p> : null}
      {!session ? <p className="mt-3 text-sm text-slate-500">Hôm nay lớp này không có buổi. Vẫn ghi nhận được nếu cần.</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void markAllPresent()} disabled={eligible.length === 0}>Điểm danh tất cả Có mặt</Button>
        <Button variant="outline" onClick={() => void undoLast()} disabled={undo.length === 0}>Hoàn tác</Button>
      </div>
      <ul className="mt-4 space-y-3">
        {visible.map((s) => {
          const row = markOf(s.id);
          const hold = frozen(s.id);
          const tone = flash[s.id] ?? row?.status;
          const shell = tone === "present" ? "border-green-300 bg-green-50" : tone === "absent" ? "border-slate-300 bg-slate-100" : tone === "excused" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white";
          return (
            <li key={s.id} className={`rounded-[12px] border p-3 ${shell} ${hold ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: s.avatarColor }}>{initials(s.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{s.name}</p>
                  <p className="text-sm text-slate-500">{seeContact ? `···${last4(s.phone)}` : "Ẩn số điện thoại"}{hold ? " · Đang bảo lưu" : ""}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold tabular-nums leading-none ${s.remainingSessions <= 2 ? "text-rose-600" : ""}`}>{s.remainingSessions}</p>
                  <p className="text-xs text-slate-400">buổi còn</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["present", "absent", "excused"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={hold}
                    onClick={() => void markOne(s, status)}
                    className={`h-10 rounded-[10px] border-[1.5px] text-sm font-semibold disabled:cursor-not-allowed ${row?.status === status ? buttonTone[status] : buttonIdle[status]}`}
                  >
                    {status === "present" ? "Có mặt" : status === "absent" ? "Vắng" : "Có phép"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-20 z-30 mt-4 rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm lg:bottom-0">
        <p className="text-xs text-slate-500">Có mặt, vắng và có phép đều trừ 1 buổi. Buổi hủy không trừ. Không học bù.</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-base font-semibold tabular-nums">Đã điểm danh {marked.length}/{eligible.length}</p>
          <Button onClick={() => setSummary(true)}>Xong</Button>
        </div>
      </div>
      {summary ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label="Đóng" onClick={() => setSummary(false)} />
          <div className="relative w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold">Tóm tắt buổi</h2>
            <p className="mt-1 text-sm text-slate-500">{klass?.name} · {today}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[12px] bg-green-50 p-3"><dt className="text-sm text-green-800">Có mặt</dt><dd className="text-3xl font-bold tabular-nums">{counts.present}</dd></div>
              <div className="rounded-[12px] bg-slate-100 p-3"><dt className="text-sm">Vắng</dt><dd className="text-3xl font-bold tabular-nums">{counts.absent}</dd></div>
              <div className="rounded-[12px] bg-amber-50 p-3"><dt className="text-sm text-amber-800">Có phép</dt><dd className="text-3xl font-bold tabular-nums">{counts.excused}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-slate-600">{cancelled ? "Buổi đã hủy nên không trừ buổi." : "Học viên đã điểm danh đã bị trừ 1 buổi. Xác nhận không trừ thêm."}</p>
            <Button className="mt-4 w-full" onClick={() => setSummary(false)}>Xác nhận</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
