"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { MapPin, QrCode, Users } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { setAttendance } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { branchHasGeo, branchRadiusM, verifyAtBranch } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { localDayKey } from "@/lib/utils";
import { useStudioBranch } from "@/stores/branch-store";

export default function QrAttendancePage() {
  const { t } = useI18n();
  const { branchId } = useStudioBranch();
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const classStudents = useLiveQuery(() => db.classStudents.toArray(), []) ?? [];
  const today = localDayKey();
  const daySessions = classes.filter(
    (c) => c.day === today && c.status !== "cancelled" && (branchId === "all" || c.branchId === branchId),
  );
  const preferred = daySessions[0]?.id ?? classes.find((c) => c.day === today)?.id ?? "";
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const current = classId || preferred;
  const klass = classes.find((c) => c.id === current);
  const branch = branches.find((b) => b.id === (klass?.branchId || (branchId !== "all" ? branchId : "")))
    ?? branches.find((b) => b.id === klass?.branchId)
    ?? branches[0];

  const roster = useMemo(() => {
    const ids = classStudents.filter((cs) => cs.classId === current).map((cs) => cs.studentId);
    if (ids.length > 0) return students.filter((s) => ids.includes(s.id) && s.status !== "paused");
    return students.filter((s) => s.courseId === klass?.courseId && s.status !== "paused");
  }, [students, classStudents, current, klass?.courseId]);

  const token = klass ? `DOLPHIN-CRM|${klass.id}|${today}` : "";
  const cells = useMemo(() => {
    let n = 0;
    for (const ch of token) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
    return Array.from({ length: 49 }, (_, i) => ((n >> (i % 24)) & 1) === 1 || (n + i) % 3 === 0);
  }, [token]);

  async function checkIn(simulateAtCenter: boolean) {
    if (!studentId || !current || !klass) return;
    setBusy(true);
    setErr("");
    setMsg("");
    const geo = await verifyAtBranch(branch, { simulateAtCenter });
    if (!geo.ok) {
      setBusy(false);
      if (geo.reason === "outside") {
        setErr(fill(t.pages.qrGeoOutside, { meters: geo.meters ?? 0, radius: geo.radiusM ?? branchRadiusM(branch) }));
      } else if (geo.reason === "denied") setErr(t.pages.qrGeoDenied);
      else if (geo.reason === "unsupported") setErr(t.pages.qrGeoUnsupported);
      else if (geo.reason === "no-branch") setErr(t.pages.qrNoBranchGeo);
      else setErr(t.pages.qrGeoUnavailable);
      return;
    }
    const code = await setAttendance({ classId: current, personId: studentId, subject: "student", status: "present" });
    setBusy(false);
    if (code === "subscription") {
      setErr(t.pages.subInvalid);
      return;
    }
    const name = roster.find((s) => s.id === studentId)?.name ?? "";
    const okNote = fill(t.pages.qrGeoOk, { meters: geo.meters, radius: geo.radiusM });
    setMsg(`${fill(t.pages.scanned, { name })}${geo.simulated ? ` · ${t.pages.qrSimulate}` : ` · ${okNote}`}`);
  }

  return (
    <div className="pb-8">
      <h1 className="crm-page-title">{t.pages.qr}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.pages.qrLead}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="border-[var(--brand-300)] bg-[var(--brand-50)] p-4">
          <div className="flex items-start gap-3">
            <span className="crm-icon-tile h-11 w-11"><QrCode size={20} /></span>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">{t.attend.modeQr}</p>
              <p className="mt-1 text-xs text-slate-600">{t.attend.modeQrLead}</p>
            </div>
          </div>
        </Card>
        <Link href="/attendance" className="crm-card-elev block p-4 transition hover:-translate-y-px">
          <div className="flex items-start gap-3">
            <span className="crm-icon-tile h-11 w-11"><Users size={20} /></span>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">{t.pages.qrDeskLink}</p>
              <p className="mt-1 text-xs text-slate-600">{t.attend.modeDeskLead}</p>
            </div>
          </div>
        </Link>
      </div>

      <section className="mt-5 space-y-4" aria-labelledby="qr-checkin-heading">
        <h2 id="qr-checkin-heading" className="crm-section-title">{t.attend.modeQr}</h2>

        <div>
          <p className="text-sm font-semibold text-slate-700">{t.pages.qrStepClass}</p>
          <select
            className="mt-2 min-h-11 w-full max-w-md rounded-xl border border-slate-200 px-3"
            value={current}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudentId("");
              setMsg("");
              setErr("");
            }}
          >
            {(daySessions.length ? daySessions : classes.slice(0, 12)).map((c) => (
              <option key={c.id} value={c.id}>{c.day} {c.start} · {c.name}</option>
            ))}
          </select>
        </div>

        {klass ? (
          <Card className="max-w-sm p-4">
            <p className="text-sm font-semibold">{klass.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {branch?.name ?? "—"}
              {branchHasGeo(branch) ? ` · ≤${branchRadiusM(branch)}m` : ""}
            </p>
            <div className="mt-3 grid w-44 grid-cols-7 gap-0.5 bg-white p-2" aria-hidden>
              {cells.map((on, i) => (
                <span key={i} className={on ? "h-4 w-4 bg-slate-900" : "h-4 w-4 bg-white"} />
              ))}
            </div>
            <p className="mt-2 break-all text-xs text-slate-400">{token}</p>
          </Card>
        ) : null}

        <div>
          <p className="text-sm font-semibold text-slate-700">{t.pages.qrStepStudent}</p>
          <select
            className="mt-2 min-h-11 w-full max-w-md rounded-xl border border-slate-200 px-3"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setMsg("");
              setErr("");
            }}
          >
            <option value="">{t.pages.pickStudent}</option>
            {roster.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">{t.pages.qrStepLocate}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={14} aria-hidden />
            {branch?.address ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!studentId || !current || busy}
              onClick={() => void checkIn(false)}
            >
              {busy ? t.pages.qrBusy : t.pages.qrCheckIn}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!studentId || !current || busy}
              onClick={() => void checkIn(true)}
            >
              {t.pages.qrSimulate}
            </Button>
          </div>
          {err ? <p className="mt-2 text-sm text-rose-700" role="alert">{err}</p> : null}
          {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
        </div>
      </section>
    </div>
  );
}
