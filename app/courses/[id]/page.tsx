"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/copy";
import { levelLabel } from "@/lib/rules";
import { cn, initials, localDayKey } from "@/lib/utils";

const tabs = ["overview", "classes", "students", "teachers", "subscriptions"] as const;
type Tab = (typeof tabs)[number];

export default function CourseDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const id = String(params?.id ?? "");
  const course = useLiveQuery(() => db.courses.get(id), [id]);
  const classes = useLiveQuery(() => db.classes.where("courseId").equals(id).toArray(), [id]) ?? [];
  const students = useLiveQuery(() => db.students.where("courseId").equals(id).toArray(), [id]) ?? [];
  const teachers = useLiveQuery(() => db.courseTeachers.where("courseId").equals(id).toArray(), [id]) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const subscriptions = useLiveQuery(() => db.subscriptions.where("courseId").equals(id).toArray(), [id]) ?? [];
  const plans = useLiveQuery(() => db.subscriptionPlans.toArray(), []) ?? [];
  const [tab, setTab] = useState<Tab>("overview");

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.day.localeCompare(b.day) || a.index - b.index),
    [classes],
  );
  const today = localDayKey();
  const renewSoon = subscriptions.filter((s) => s.status === "active" && s.endDay <= today);

  if (course === undefined) {
    return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  }
  if (!course) {
    return <p className="text-sm text-slate-500">{t.common.notFound}</p>;
  }

  const branch = branches.find((b) => b.id === course.branchId);
  const room = rooms.find((r) => r.id === course.roomId);

  const tabLabel: Record<Tab, string> = {
    overview: "Overview",
    classes: `${t.nav.classes} (${sortedClasses.length})`,
    students: `${t.nav.students} (${students.length})`,
    teachers: `${t.nav.teachers} (${teachers.length})`,
    subscriptions: `Subscriptions (${subscriptions.length})`,
  };

  return (
    <div>
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/courses" className="font-semibold text-[var(--brand-600)] hover:underline">{t.nav.courses}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{course.name}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{course.name}</h1>
          <p className="crm-lead mt-1">
            {course.style} · {levelLabel(course.level)} · {course.slot}
          </p>
          <p className="crm-body mt-1.5 text-slate-600">
            {t.catalog.capacityCurrent}: <span className="font-semibold tabular-nums text-slate-900">{students.length}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {t.catalog.capacityMax}: <span className="font-semibold tabular-nums text-slate-900">{course.capacity ?? 12}</span>
            <span className="crm-meta ml-1.5">({fill(t.catalog.studentsFill, { n: students.length, cap: course.capacity ?? 12 })})</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone={course.active ? "ok" : "warn"}>{course.active ? t.pages.open : t.pages.pausedCourse}</Badge>
            {branch ? <Badge tone="info">{branch.name}</Badge> : null}
            {room ? <Badge>{room.name}</Badge> : <Badge tone="neutral">No default room</Badge>}
            {renewSoon.length > 0 ? <Badge tone="danger">Renew {renewSoon.length}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/schedule" className="crm-outline inline-flex h-10 items-center rounded-[10px] border-[1.5px] border-[var(--brand-500)] px-3.5 text-sm font-semibold text-[var(--brand-500)]">
            {t.nav.schedule}
          </Link>
          <Link href="/enroll" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-3.5 text-sm font-semibold text-white">
            {t.nav.midEnroll}
          </Link>
        </div>
      </header>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-[#E2E8F0]" role="tablist">
        {tabs.map((idTab) => (
          <button
            key={idTab}
            type="button"
            role="tab"
            aria-selected={tab === idTab}
            onClick={() => setTab(idTab)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm",
              tab === idTab ? "border-[var(--brand-500)] font-semibold text-[var(--brand-700)]" : "border-transparent text-slate-500",
            )}
          >
            {tabLabel[idTab]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "overview" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(
              [
                { label: t.nav.classes, n: String(sortedClasses.length), tab: "classes" as Tab },
                { label: t.catalog.capacityCurrent, n: String(students.length), tab: "students" as Tab },
                { label: t.catalog.capacityMax, n: String(course.capacity ?? 12), tab: null },
                { label: t.nav.teachers, n: String(teachers.length), tab: "teachers" as Tab },
                { label: "Subscriptions", n: String(subscriptions.length), tab: "subscriptions" as Tab },
              ] as const
            ).map((card) => {
              const className =
                "rounded-[12px] border border-[#E2E8F0] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]";
              if (card.tab) {
                return (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => setTab(card.tab)}
                    className={`${className} hover:border-[var(--brand-300)]`}
                  >
                    <p className="crm-lead">{card.label}</p>
                    <p className="crm-kpi mt-1 text-slate-900">{card.n}</p>
                  </button>
                );
              }
              return (
                <div key={card.label} className={className}>
                  <p className="crm-lead">{card.label}</p>
                  <p className="crm-kpi mt-1 text-slate-900">{card.n}</p>
                </div>
              );
            })}
            <div className="md:col-span-2 xl:col-span-3 rounded-[12px] border border-[#E2E8F0] bg-white p-4 text-sm text-slate-600">
              <p>{course.description || "—"}</p>
              <p className="mt-2 text-slate-400">
                {course.startDay} → {course.endDay} · {course.sessionCount} buổi · {t.catalog.capacityCurrent} {students.length} · {t.catalog.capacityMax} {course.capacity ?? 12}
              </p>
            </div>
          </div>
        ) : null}

        {tab === "classes" ? (
          <div className="overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">#</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Day</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Time</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.nav.teachers}</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.nav.rooms}</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {sortedClasses.map((c) => {
                  const teacher = users.find((u) => u.id === c.teacherId);
                  const r = rooms.find((x) => x.id === c.roomId);
                  return (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-[var(--brand-50)]">
                      <td className="px-3 py-2.5">
                        <Link href={`/classes/${c.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">
                          {c.index}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/classes/${c.id}`} className="text-slate-800 hover:underline">{c.day}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{c.start}–{c.end}</td>
                      <td className="px-3 py-2.5">
                        {teacher ? (
                          <Link href={`/teachers/${teacher.id}`} className="text-[var(--brand-600)] hover:underline">{teacher.name}</Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{r ? <Link href="/rooms" className="hover:underline">{r.name}</Link> : "—"}</td>
                      <td className="px-3 py-2.5"><Badge tone={c.status === "cancelled" ? "danger" : c.status === "completed" ? "neutral" : "ok"}>{c.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "students" ? (
          <div className="overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.nav.students}</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Sub left</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-[var(--brand-50)]">
                    <td className="px-3 py-2.5">
                      <Link href={`/students/${s.id}`} className="flex items-center gap-2 font-semibold text-[var(--brand-600)] hover:underline">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.avatarColor }}>{initials(s.name)}</span>
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{s.remainingSessions}</td>
                    <td className="px-3 py-2.5"><Badge>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "teachers" ? (
          <ul className="space-y-2">
            {teachers.map((ct) => {
              const u = users.find((x) => x.id === ct.teacherId);
              if (!u) return null;
              return (
                <li key={ct.id}>
                  <Link href={`/teachers/${u.id}`} className="flex items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[var(--brand-300)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: u.avatarColor }}>{initials(u.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{u.name}</span>
                      <span className="text-xs text-slate-500">{u.phone}</span>
                    </span>
                    <Badge tone={ct.role === "main" ? "ok" : "info"}>{ct.role}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === "subscriptions" ? (
          <div className="overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.nav.students}</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Plan</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">End</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Left</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const st = students.find((s) => s.id === sub.studentId) ?? users.find(() => false);
                  const student = students.find((s) => s.id === sub.studentId);
                  const plan = plans.find((p) => p.id === sub.planId);
                  const needRenew = sub.status === "active" && sub.endDay <= today;
                  return (
                    <tr key={sub.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5">
                        {student ? (
                          <Link href={`/students/${student.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">{student.name}</Link>
                        ) : sub.studentId}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{plan?.name ?? sub.planId}</td>
                      <td className="px-3 py-2.5 tabular-nums">{sub.endDay}</td>
                      <td className="px-3 py-2.5 tabular-nums">{sub.remainingSessions}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={needRenew ? "danger" : sub.status === "active" ? "ok" : "neutral"}>
                          {needRenew ? "renew" : sub.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
