"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Badge, Button, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { addStudentNote, moveStudentClass } from "@/lib/actions";
import { db } from "@/lib/db";
import { attendLabel, holdStatusLabel } from "@/lib/labels";
import { levelLabel } from "@/lib/rules";
import { debtRemaining } from "@/lib/metrics";
import { studentBadges } from "@/lib/student-badges";
import { ageYears, formatVnd, initials, isMinor } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const tabs = [
  { id: "info", label: "Thông tin" },
  { id: "courses", label: "Khóa đang học" },
  { id: "attendance", label: "Lịch sử điểm danh" },
  { id: "money", label: "Thanh toán & Công nợ" },
  { id: "hold", label: "Bảo lưu" },
  { id: "activity", label: "Hoạt động" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function StudentDrawer({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const enrollments = useLiveQuery(() => db.enrollments.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const payments = useLiveQuery(() => db.payments.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const receivables = useLiveQuery(() => db.receivables.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const attendance = useLiveQuery(() => db.attendance.where("studentId").equals(studentId).toArray(), [studentId]) ?? [];
  const [tab, setTab] = useState<TabId>("info");
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState("");
  const [moveError, setMoveError] = useState("");
  const [moving, setMoving] = useState(false);

  const visibleTabs = tabs.filter((t) => t.id !== "money" || seeMoney);
  const marks = useMemo(
    () => [...attendance].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 20),
    [attendance],
  );
  const counted = attendance.filter((a) => !a.waived);
  const present = counted.filter((a) => a.status === "present").length;
  const rate = counted.length === 0 ? 0 : Math.round((present / counted.length) * 100);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = receivables.reduce((s, r) => s + debtRemaining(r), 0);
  const activity = useMemo(() => {
    if (!student) return [];
    const rows = [
      ...student.notes.map((n, i) => ({ id: `n${i}`, day: n.day, text: `Ghi chú: ${n.text}` })),
      ...enrollments.map((e) => ({
        id: e.id,
        day: e.day,
        text: `Ghi danh ${packages.find((p) => p.id === e.packageId)?.name ?? ""} · ${classes.find((c) => c.id === e.classId)?.name ?? ""} · ${e.sessions} buổi`,
      })),
      ...attendance.map((a) => ({
        id: a.id,
        day: a.day,
        text: `Điểm danh ${classes.find((c) => c.id === a.classId)?.name ?? ""} · ${attendLabel(a.status)}`,
      })),
      ...(seeMoney
        ? payments.map((p) => ({ id: p.id, day: p.day, text: `Thanh toán ${formatVnd(p.amount)} · ${p.note || "Học phí"}` }))
        : []),
      ...holds.map((h) => ({ id: h.id, day: h.fromDay, text: `Bảo lưu ${holdStatusLabel(h.status)} · ${h.reason}` })),
    ];
    return rows.sort((a, b) => b.day.localeCompare(a.day));
  }, [student, enrollments, attendance, payments, holds, packages, classes, seeMoney]);

  if (student === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
        <aside className="h-full w-full max-w-xl bg-white p-6 text-sm text-slate-500">Đang tải hồ sơ…</aside>
      </div>
    );
  }
  if (!student) return null;

  const course = courses.find((c) => c.id === student.courseId);
  const klass = classes.find((c) => c.id === student.classId);
  const pack = packages.find((p) => p.id === student.packageId);
  const branch = branches.find((b) => b.id === student.branchId);
  const age = ageYears(student.birthDay);
  const kid = isMinor(student.birthDay);
  const badges = studentBadges(student, holds, seeMoney);
  const currentHold = holds.find((h) => h.status === "approved" || h.status === "pending");

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button className="absolute inset-0" aria-label="Đóng hồ sơ" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <header className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: student.avatarColor }}>
              {initials(student.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{student.name}</h2>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Đóng" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500">{seeContact ? student.phone : "Giáo viên không xem số điện thoại"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
                {student.flagged ? <Badge tone="warn">Đã đánh dấu</Badge> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? "shrink-0 border-b-2 border-[#F97316] px-2 py-2 text-sm font-semibold text-[#C2410C]" : "shrink-0 border-b-2 border-transparent px-2 py-2 text-sm text-slate-500"}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "info" ? (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-slate-500">Email</dt><dd className="font-semibold">{seeContact ? student.email || "—" : "Ẩn"}</dd></div>
                <div><dt className="text-slate-500">Ngày sinh</dt><dd className="font-semibold">{student.birthDay || "—"}{age !== null ? ` · ${age} tuổi` : ""}</dd></div>
                <div><dt className="text-slate-500">Chi nhánh</dt><dd className="font-semibold">{branch?.name ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Vào học</dt><dd className="font-semibold">{student.joinedDay}</dd></div>
              </dl>
              {kid && seeContact ? (
                <section className="rounded-[12px] bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">Phụ huynh</h3>
                  <p className="mt-1 font-semibold">{student.parentName || "Chưa lưu tên"}</p>
                  <p className="text-slate-500">{student.parentPhone || "Chưa có số"}</p>
                </section>
              ) : null}
              <section>
                <h3 className="text-xs font-semibold uppercase text-slate-500">Ghi chú nội bộ</h3>
                <ul className="mt-2 space-y-2">
                  {student.notes.length === 0 ? <li className="text-slate-500">Chưa có ghi chú.</li> : null}
                  {student.notes.map((n, i) => (
                    <li key={i} className="rounded-[12px] border border-slate-100 px-3 py-2">
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-slate-400">{n.day}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input className={inputClass} placeholder="Thêm ghi chú nội bộ" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button type="button" onClick={() => void saveNote()} disabled={!note.trim()}>Lưu</Button>
                </div>
              </section>
            </div>
          ) : null}
          {tab === "courses" ? (
            <div className="space-y-3 text-sm">
              <article className="rounded-[12px] border border-slate-200 p-3">
                <p className="font-semibold">{course?.name ?? klass?.name ?? "Chưa gắn khóa"}</p>
                <p className="mt-1 text-slate-500">{levelLabel(student.level)} · {klass?.name} · {branch?.name}</p>
                <p className="mt-2">Gói {pack?.name ?? "—"} · còn <b className={student.remainingSessions <= 3 ? "text-rose-600" : ""}>{student.remainingSessions}</b> buổi</p>
              </article>
              {enrollments.length > 1 ? (
                <ul className="space-y-1 text-slate-600">
                  {enrollments.map((e) => (
                    <li key={e.id}>{e.day} · {packages.find((p) => p.id === e.packageId)?.name} · {classes.find((c) => c.id === e.classId)?.name}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/ghi-danh" className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-4 text-sm font-semibold">Ghi danh thêm</Link>
              </div>
              <div className="rounded-[12px] border border-slate-100 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Đổi lớp</p>
                <select className={`${inputClass} mt-2`} value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Chọn lớp mới</option>
                  {classes.filter((c) => c.id !== student.classId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {branches.find((b) => b.id === c.branchId)?.name}</option>
                  ))}
                </select>
                {moveError ? <p className="mt-2 text-rose-600">{moveError}</p> : null}
                <Button type="button" className="mt-2" variant="outline" disabled={!classId || moving} onClick={() => void changeClass()}>Đổi lớp</Button>
              </div>
            </div>
          ) : null}
          {tab === "attendance" ? (
            <div className="text-sm">
              <p className="text-2xl font-bold tabular-nums">{rate}%</p>
              <p className="text-slate-500">{present}/{counted.length} buổi có mặt</p>
              <table className="mt-3 w-full">
                <thead className="text-left text-xs text-slate-500">
                  <tr><th className="py-2">Ngày</th><th>Lớp</th><th>Trạng thái</th></tr>
                </thead>
                <tbody>
                  {marks.length === 0 ? <tr><td className="py-2 text-slate-500" colSpan={3}>Chưa có điểm danh.</td></tr> : null}
                  {marks.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-2">{a.day}</td>
                      <td>{classes.find((c) => c.id === a.classId)?.name}</td>
                      <td>{attendLabel(a.status)}{a.waived ? " · không trừ" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {tab === "money" && seeMoney ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-slate-50 p-3"><p className="text-slate-500">Đã thu</p><p className="text-lg font-bold tabular-nums">{formatVnd(paidTotal)}</p></div>
                <div className="rounded-[12px] bg-amber-50 p-3"><p className="text-amber-800">Còn nợ</p><p className="text-lg font-bold tabular-nums text-amber-800">{formatVnd(outstanding || student.debt)}</p></div>
              </div>
              <Link href="/thu-hoc-phi" className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-4 text-sm font-semibold">Thu học phí</Link>
              <ul className="space-y-2">
                {payments.length === 0 ? <li className="text-slate-500">Chưa có phiếu thu.</li> : null}
                {[...payments].sort((a, b) => b.day.localeCompare(a.day)).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <span>{p.day} · {p.note || (p.method === "transfer" ? "Chuyển khoản" : "Tiền mặt")}</span>
                    <b className="tabular-nums">{formatVnd(p.amount)}</b>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {tab === "hold" ? (
            <div className="space-y-3 text-sm">
              {currentHold ? (
                <article className="rounded-[12px] border border-slate-200 p-3">
                  <Badge tone={currentHold.status === "approved" ? "info" : "warn"}>{holdStatusLabel(currentHold.status)}</Badge>
                  <p className="mt-2 font-semibold">{currentHold.fromDay} → {currentHold.toDay}</p>
                  <p className="text-slate-500">{currentHold.reason}</p>
                  <p className="mt-1">{currentHold.credits} buổi giữ chỗ</p>
                </article>
              ) : (
                <p className="text-slate-500">Không đang bảo lưu.</p>
              )}
              <h3 className="text-xs font-semibold uppercase text-slate-500">Lịch sử</h3>
              <ul className="space-y-2">
                {holds.length === 0 ? <li className="text-slate-500">Chưa có phiếu bảo lưu.</li> : null}
                {[...holds].sort((a, b) => b.fromDay.localeCompare(a.fromDay)).map((h) => (
                  <li key={h.id} className="border-t border-slate-100 py-2">
                    {h.fromDay} → {h.toDay} · {holdStatusLabel(h.status)} · {h.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {tab === "activity" ? (
            <ul className="space-y-3 text-sm">
              {activity.length === 0 ? <li className="text-slate-500">Chưa có hoạt động.</li> : null}
              {activity.map((a) => (
                <li key={a.id} className="relative border-l border-slate-200 pl-3">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#F97316]" />
                  <p>{a.text}</p>
                  <p className="text-xs text-slate-400">{a.day}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
