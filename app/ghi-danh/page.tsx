"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, inputClass } from "@/components/ui";
import { canSeeMoney } from "@/lib/access";
import { createStudent, enrollMidCourse } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { canJoinAtSession, levelLabel } from "@/lib/rules";
import { nextJoinSession, proratedFee, sessionsLeftInCourse } from "@/lib/schedule";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { PayMethod } from "@/types";

const steps = ["Học viên", "Khóa", "Tính buổi", "Xác nhận"];

export default function MidEnrollPage() {
  const { lang, t } = useI18n();
  const seeMoney = canSeeMoney(useAuthStore((s) => s.user?.role));
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.packages.filter((p) => p.kind === "course").toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const [step, setStep] = useState(1);
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", branchId: "" });
  const [classId, setClassId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [payNow, setPayNow] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const { branchId: studioBranch } = useStudioBranch();

  useEffect(() => {
    if (studioBranch === "all") return;
    setDraft((d) => (d.branchId ? d : { ...d, branchId: studioBranch }));
  }, [studioBranch]);

  const student = students.find((s) => s.id === studentId);
  const offers = useMemo(() => {
    return courses.map((course) => {
      const klass = classes.find((c) => c.id === course.classId);
      const rows = sessions.filter((s) => s.courseId === course.id);
      const next = nextJoinSession(rows);
      const gate = next ? canJoinAtSession(course.level, next.index, lang) : { ok: false, reason: t.enroll.ended };
      const seated = students.filter((s) => s.classId === course.classId).length;
      const seats = Math.max(0, (klass?.capacity ?? 0) - seated);
      const granted = next ? sessionsLeftInCourse(rows, next.index) : 0;
      return { course, klass, next, gate, seated, seats, granted };
    });
  }, [courses, classes, sessions, students, lang, t]);
  const picked = offers.find((o) => o.course.classId === classId);
  const pack = packages.find((p) => p.id === packageId);
  const price = pack && picked ? proratedFee(pack.price, pack.sessions, picked.granted) : 0;
  const matches = students.filter((s) => {
    if (studioBranch !== "all" && s.branchId !== studioBranch) return false;
    return `${s.name} ${s.phone}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  async function nextStep() {
    setError("");
    if (step === 1) {
      if (creating) {
        setBusy(true);
        const result = await createStudent(draft);
        setBusy(false);
        if (result.error || !result.id) {
          setError(result.error || "Không tạo được học viên.");
          return;
        }
        setStudentId(result.id);
        setCreating(false);
      } else if (!studentId) {
        setError("Chọn học viên hoặc tạo mới.");
        return;
      }
    }
    if (step === 2) {
      if (!picked?.next || !picked.gate.ok) {
        setError(picked?.gate.reason || "Chọn một khóa còn nhận giữa khóa.");
        return;
      }
      if (picked.seats <= 0 && student?.classId !== picked.course.classId) {
        setError("Lớp đã đủ chỗ.");
        return;
      }
    }
    if (step === 3) {
      if (!pack) {
        setError("Chọn gói để tính giá và số buổi.");
        return;
      }
      if (!picked || picked.granted <= 0) {
        setError("Khóa không còn buổi để vào.");
        return;
      }
    }
    setStep((n) => Math.min(4, n + 1));
  }

  async function confirm() {
    if (!studentId || !packageId || !classId) return;
    setBusy(true);
    const err = await enrollMidCourse({
      studentId,
      packageId,
      classId,
      payNow: seeMoney ? Number(payNow || 0) : 0,
      method,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(picked ? `Đã ghi danh. Cộng ${picked.granted} buổi còn của khóa.` : "Đã ghi danh.");
    setError("");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold">{t.enroll.title}</h1>
      <p className="mt-1 text-sm text-slate-500">Begin chỉ đến buổi 3. Inter chỉ buổi lẻ. Advance chỉ buổi 1 và 5. Học viên vẫn vào lớp khi chưa đóng đủ.</p>
      <ol className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {steps.map((label, i) => {
          const n = i + 1;
          const on = step === n;
          const passed = step > n || Boolean(done);
          return (
            <li key={label} className="shrink-0">
              <button type="button" disabled={n > step} onClick={() => { if (n < step) { setStep(n); setError(""); } }} className={`flex min-h-12 items-center gap-2 rounded-[12px] border px-3 text-left text-sm whitespace-nowrap ${on ? "border-[var(--brand-500)] bg-[var(--brand-50)] font-semibold" : passed ? "border-slate-200 bg-white" : "border-slate-100 text-slate-400"}`}>
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${on || passed ? "bg-[var(--brand-500)] text-white" : "bg-slate-100"}`}>{n}</span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {error ? <p className="mt-3 rounded-[12px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {done ? <p className="mt-3 rounded-[12px] bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p> : null}

      {step === 1 && !done ? (
        <section className="mt-4 rounded-[12px] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={!creating ? "h-10 rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white" : "h-10 rounded-[10px] border border-[#E2E8F0] px-4 text-sm"} onClick={() => setCreating(false)}>Học viên có sẵn</button>
            <button type="button" className={creating ? "h-10 rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white" : "h-10 rounded-[10px] border border-[#E2E8F0] px-4 text-sm"} onClick={() => { setCreating(true); setStudentId(""); }}>Tạo mới nhanh</button>
          </div>
          {creating ? (
            <div className="mt-3 grid gap-2">
              <input className={inputClass} placeholder="Tên học viên" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              <input className={inputClass} placeholder="Số điện thoại" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
              <select className={inputClass} value={draft.branchId} onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))}>
                <option value="">Chi nhánh</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="mt-3">
              <input className={inputClass} placeholder="Tìm tên hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
                {matches.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={`flex min-h-12 w-full items-center justify-between rounded-[12px] px-3 text-left ${studentId === s.id ? "bg-[var(--brand-50)] font-semibold" : "hover:bg-slate-50"}`} onClick={() => setStudentId(s.id)}>
                      <span>{s.name}</span>
                      <span className="text-sm text-slate-500">{s.remainingSessions} buổi</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {step === 2 && !done ? (
        <section className="mt-4 space-y-2">
          {offers.filter((offer) => studioBranch === "all" || offer.course.branchId === studioBranch).map((offer) => {
            const open = offer.gate.ok && offer.next;
            const selected = classId === offer.course.classId;
            return (
              <button
                key={offer.course.id}
                type="button"
                disabled={!open}
                onClick={() => setClassId(offer.course.classId)}
                className={`w-full rounded-[12px] border p-3 text-left ${selected ? "border-[var(--brand-500)] bg-[var(--brand-50)]" : "border-slate-200 bg-white"} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{offer.course.name} · {levelLabel(offer.course.level)}</span>
                    <span className="mt-1 block text-sm">{offer.next ? `Buổi ${offer.next.index}` : "Hết buổi"} · còn {offer.seats} chỗ</span>
                  </span>
                  <span className="text-sm">{open ? "Nhận" : offer.gate.reason}</span>
                </span>
              </button>
            );
          })}
        </section>
      ) : null}

      {step === 3 && picked && !done ? (
        <section className="mt-4 rounded-[12px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{picked.course.name} · vào từ buổi {picked.next?.index}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{picked.granted}</p>
          <p className="text-sm text-slate-500">Buổi còn lại của khóa, không tính buổi đã hủy</p>
          <label className="mt-4 block text-sm">
            <span className="text-slate-500">Gói sẽ trừ vào</span>
            <select className={`${inputClass} mt-1`} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">Chọn gói</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sessions} buổi</option>)}
            </select>
          </label>
          {pack && seeMoney ? (
            <div className="mt-4 rounded-[12px] bg-slate-50 p-3 text-sm">
              <p>Giá theo tỷ lệ: {formatVnd(price)}</p>
              <p className="text-slate-500">{picked.granted}/{pack.sessions} buổi của {pack.name}. Học phí mẫu của studio.</p>
            </div>
          ) : null}
          {pack && !seeMoney ? <p className="mt-3 text-sm text-slate-500">Giá ẩn với giáo viên. Vẫn ghi được số buổi.</p> : null}
        </section>
      ) : null}

      {step === 4 && picked && student && !done ? (
        <section className="mt-4 rounded-[12px] border border-slate-200 bg-white p-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-slate-500">Học viên</dt><dd className="font-semibold">{student.name}</dd></div>
            <div><dt className="text-slate-500">Khóa</dt><dd className="font-semibold">{picked.course.name}</dd></div>
            <div><dt className="text-slate-500">Buổi cộng thêm</dt><dd className="font-semibold">{picked.granted}</dd></div>
            <div><dt className="text-slate-500">Gói</dt><dd className="font-semibold">{pack?.name}</dd></div>
            {seeMoney ? <div><dt className="text-slate-500">Phải thu</dt><dd className="font-semibold">{formatVnd(price)}</dd></div> : null}
          </dl>
          <p className="mt-3 text-slate-600">Có thể ghi danh khi còn nợ. Buổi đã cộng ngay khi xác nhận.</p>
          {seeMoney ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label>Thu ngay, bỏ trống nếu chưa thu
                <input className={`${inputClass} mt-1`} inputMode="numeric" placeholder="0" value={payNow} onChange={(e) => setPayNow(e.target.value.replace(/[^\d]/g, ""))} />
              </label>
              <label>Hình thức
                <select className={`${inputClass} mt-1`} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>
      ) : null}

      {!done ? (
        <div className="mt-4 flex gap-2">
          {step > 1 ? <Button variant="outline" className="min-h-12" onClick={() => { setStep((n) => n - 1); setError(""); }}>Quay lại</Button> : null}
          {step < 4 ? <Button className="min-h-12" disabled={busy} onClick={() => void nextStep()}>Tiếp tục</Button> : <Button className="min-h-12" disabled={busy} onClick={() => void confirm()}>Xác nhận ghi danh</Button>}
        </div>
      ) : null}
    </div>
  );
}
