"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import { Badge, Button, inputClass } from "@/components/ui";
import { canApproveHold } from "@/lib/access";
import { decideHold, endHoldEarly } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { holdStatusLabel } from "@/lib/labels";
import { initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Hold } from "@/types";

type Tab = "pending" | "active" | "expired" | "all";

function bucket(hold: Hold, today: string): Exclude<Tab, "all"> {
  if (hold.status === "pending") return "pending";
  if (hold.status === "approved" && hold.toDay >= today) return "active";
  return "expired";
}

export default function HoldsPage() {
  const { lang, t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const manager = canApproveHold(user?.role);
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const packages = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const enrollments = useLiveQuery(() => db.subscriptions.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const [tab, setTab] = useState<Tab>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState("");
  const today = localDayKey();
  const open = holds.find((h) => h.id === openId) ?? null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: t.hold.tabPending },
    { id: "active", label: t.hold.tabActive },
    { id: "expired", label: t.hold.tabExpired },
    { id: "all", label: t.hold.tabAll },
  ];

  const rows = holds
    .filter((h) => tab === "all" || bucket(h, today) === tab)
    .sort((a, b) => b.fromDay.localeCompare(a.fromDay));

  function packForStudent(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    const sub = enrollments.find((e) => e.id === student?.subscriptionId)
      ?? enrollments.filter((e) => e.studentId === studentId).sort((a, b) => b.day.localeCompare(a.day))[0];
    return packages.find((p) => p.id === (sub?.planId ?? student?.packageId));
  }

  async function approve() {
    if (!open || !user) return;
    const err = await decideHold(open.id, "approved", user.role, user.id);
    setMessage(err);
    if (!err) setTab("active");
  }

  async function reject() {
    if (!open || !user) return;
    const err = await decideHold(open.id, "rejected", user.role, user.id, rejectReason);
    setMessage(err);
    if (!err) {
      setRejectReason("");
      setTab("expired");
    }
  }

  async function finishEarly() {
    if (!open || !user) return;
    const err = await endHoldEarly(open.id, user.role, user.id);
    setMessage(err);
    if (!err) setTab("expired");
  }

  return (
    <div>
      <h1 className="crm-page-title">{t.hold.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.hold.lead}</p>
      {message ? <p className="mt-3 rounded-[14px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p> : null}
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id
              ? "h-9 shrink-0 rounded-full bg-[var(--brand-50)] px-4 text-sm font-semibold text-[var(--brand-600)]"
              : "h-9 shrink-0 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--muted)]"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 ? <li className="rounded-[18px] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">{t.hold.empty}</li> : null}
        {rows.map((h) => {
          const student = students.find((s) => s.id === h.studentId);
          const pack = packForStudent(h.studentId);
          return (
            <li key={h.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white px-4 py-4 text-left shadow-[var(--shadow-card)]"
                onClick={() => { setOpenId(h.id); setMessage(""); setRejectReason(h.rejectReason ?? ""); }}
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: student?.avatarColor ?? "#7C3AED" }}>
                  {initials(student?.name ?? "?")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[var(--foreground)]">{student?.name}</span>
                  <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">{pack?.name ?? "—"} · {h.fromDay} → {h.toDay}</span>
                </span>
                <Badge tone={h.status === "pending" ? "warn" : h.status === "approved" ? "ok" : h.status === "rejected" ? "danger" : "neutral"}>
                  {holdStatusLabel(h.status, lang)}
                </Badge>
                <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button className="absolute inset-0" aria-label={t.common.close} onClick={() => setOpenId(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5">
            {(() => {
              const student = students.find((s) => s.id === open.studentId);
              const pack = packForStudent(open.studentId);
              const course = courses.find((c) => c.id === student?.courseId);
              const bought = enrollments.some((e) => e.studentId === open.studentId && e.planId === "phold");
              const gifted = Boolean(pack && pack.months >= 3);
              const skipped = sessions.filter((s) => student && s.courseId === student.courseId && s.status === "cancelled" && s.day >= open.fromDay && s.day <= open.toDay);
              const living = open.status === "approved" && open.toDay >= today;
              return (
                <>
                  <h2 className="crm-page-title">{student?.name}</h2>
                  <p className="text-sm text-slate-500">{pack?.name} · {fill(t.drawer.sessionsLeft, { n: student?.remainingSessions ?? open.credits })}</p>
                  <Badge tone={open.status === "pending" ? "warn" : open.status === "approved" ? "info" : "neutral"}>{holdStatusLabel(open.status, lang)}</Badge>
                  <h3 className="mt-4 text-sm font-semibold">{t.hold.reason}</h3>
                  <p className="mt-1 text-sm">{open.reason}</p>
                  <h3 className="mt-4 text-sm font-semibold">{t.hold.window}</h3>
                  <p className="mt-1 text-sm">{open.fromDay} → {open.toDay}</p>
                  <h3 className="mt-4 text-sm font-semibold">{t.hold.rules}</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    <li className={gifted ? "text-green-700" : "text-amber-800"}>{gifted ? t.hold.giftOk : t.hold.giftNeed}</li>
                    {!gifted ? <li className={bought ? "text-green-700" : "text-rose-700"}>{bought ? t.hold.boughtOk : t.hold.boughtNeed}</li> : null}
                    <li>{t.hold.freeze}</li>
                    <li>{fill(t.hold.keepSeat, { class: course?.name ?? "—" })}</li>
                    <li>{skipped.length > 0 ? fill(t.hold.skippedN, { n: skipped.length }) : t.hold.skippedOk}</li>
                  </ul>
                  {open.rejectReason ? <p className="mt-3 text-sm text-rose-700">{t.hold.rejectReason}: {open.rejectReason}</p> : null}
                  {manager && open.status === "pending" ? (
                    <div className="mt-4 space-y-2">
                      <Button className="min-h-12 w-full" onClick={() => void approve()}>{t.hold.approve}</Button>
                      <input className={inputClass} placeholder={t.hold.rejectReason} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <Button className="min-h-12 w-full" variant="outline" onClick={() => void reject()}>{t.hold.reject}</Button>
                    </div>
                  ) : null}
                  {manager && living ? <Button className="mt-4 min-h-12 w-full" variant="outline" onClick={() => void finishEarly()}>{t.hold.endEarly}</Button> : null}
                  {!manager ? <p className="mt-4 text-sm text-slate-500">{t.hold.managerOnly}</p> : null}
                </>
              );
            })()}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
