"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CourseGenerateClassesDrawer } from "@/components/course-generate-classes-drawer";
import { Badge, Button } from "@/components/ui";
import { canCourseAction, canSeeTab } from "@/lib/access";
import {
  fetchMaCourseByCode,
  fetchMaCourseClasses,
  type MaCourse,
} from "@/lib/api/crm-courses";
import { fetchMaBranches, fetchMaStaff } from "@/lib/api/crm-tasks";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/copy";
import { levelLabel } from "@/lib/rules";
import { tabKeyFor } from "@/lib/tabs";
import { cn, initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Branch, Course, StudioClass, User } from "@/types";

const tabs = ["overview", "classes", "students", "teachers", "subscriptions"] as const;
type Tab = (typeof tabs)[number];

export type CourseDetailSource =
  | { kind: "ma-code"; code: string }
  | { kind: "demo-id"; id: string };

export function CourseDetailScreen({ source }: { source: CourseDetailSource }) {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const canGenerate = canCourseAction(role, "generate");
  const demoId = source.kind === "demo-id" ? source.id : "";
  const maCode = source.kind === "ma-code" ? source.code.trim() : "";
  const dexieCourse = useLiveQuery(
    () => (source.kind === "demo-id" ? db.courses.get(demoId) : undefined),
    [demoId, source.kind],
  );
  const dexieClasses =
    useLiveQuery(
      () => (source.kind === "demo-id" ? db.classes.where("courseId").equals(demoId).toArray() : []),
      [demoId, source.kind],
    ) ?? [];
  const students =
    useLiveQuery(
      () => (source.kind === "demo-id" ? db.students.where("courseId").equals(demoId).toArray() : []),
      [demoId, source.kind],
    ) ?? [];
  const dexieTeachers =
    useLiveQuery(
      () =>
        source.kind === "demo-id" ? db.courseTeachers.where("courseId").equals(demoId).toArray() : [],
      [demoId, source.kind],
    ) ?? [];
  const dexieUsers =
    useLiveQuery(() => (source.kind === "demo-id" ? db.users.toArray() : []), [source.kind]) ?? [];
  const rooms =
    useLiveQuery(() => (source.kind === "demo-id" ? db.rooms.toArray() : []), [source.kind]) ?? [];
  const dexieBranches =
    useLiveQuery(() => (source.kind === "demo-id" ? db.branches.toArray() : []), [source.kind]) ??
    [];
  const subscriptions =
    useLiveQuery(
      () =>
        source.kind === "demo-id" ? db.subscriptions.where("courseId").equals(demoId).toArray() : [],
      [demoId, source.kind],
    ) ?? [];
  const plans =
    useLiveQuery(
      () => (source.kind === "demo-id" ? db.subscriptionPlans.toArray() : []),
      [source.kind],
    ) ?? [];
  const [tab, setTab] = useState<Tab>("overview");
  const [maCourse, setMaCourse] = useState<MaCourse | null | undefined>(
    source.kind === "ma-code" ? undefined : null,
  );
  const [maClasses, setMaClasses] = useState<StudioClass[]>([]);
  const [maUsers, setMaUsers] = useState<User[]>([]);
  const [maBranches, setMaBranches] = useState<Branch[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [maTick, setMaTick] = useState(0);

  const reloadMa = useCallback(async () => {
    if (source.kind !== "ma-code" || !maCode) return;
    try {
      const c = await fetchMaCourseByCode(maCode);
      const [cls, staff, branches] = await Promise.all([
        fetchMaCourseClasses(c.id),
        fetchMaStaff(),
        fetchMaBranches(),
      ]);
      setMaCourse(c);
      setMaClasses(cls);
      setMaUsers(staff);
      setMaBranches(
        branches.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          checkInRadiusM: b.checkInRadiusM,
        })),
      );
    } catch {
      setMaCourse(null);
    }
  }, [source.kind, maCode]);

  useEffect(() => {
    void reloadMa();
  }, [reloadMa, maTick]);

  const course: Course | undefined | null = source.kind === "ma-code" ? maCourse : dexieCourse;
  const classes = source.kind === "ma-code" ? maClasses : dexieClasses;
  const users = source.kind === "ma-code" ? maUsers : dexieUsers;
  const branches = source.kind === "ma-code" ? maBranches : dexieBranches;
  const teachers = source.kind === "ma-code" ? (maCourse?.teachers ?? []) : dexieTeachers;
  const isMa = source.kind === "ma-code";

  const visibleTabs = tabs.filter((idTab) => {
    if (isMa && (idTab === "students" || idTab === "subscriptions")) return false;
    const key = tabKeyFor("course", idTab);
    return key ? canSeeTab(role, key) : true;
  });
  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? "overview";

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.day.localeCompare(b.day) || a.index - b.index),
    [classes],
  );
  const today = localDayKey();
  const renewSoon = subscriptions.filter((s) => s.status === "active" && s.endDay <= today);
  const maGenerated = isMa ? Boolean(maCourse?.classesGenerated) : sortedClasses.length > 0;

  if (source.kind === "ma-code" && !maCode) {
    return <p className="text-sm text-slate-500">{t.common.notFound}</p>;
  }
  if (course === undefined) {
    return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  }
  if (!course) {
    return <p className="text-sm text-slate-500">{t.common.notFound}</p>;
  }

  const branch = branches.find((b) => b.id === course.branchId);
  const room = rooms.find((r) => r.id === course.roomId);

  const tabLabel: Record<Tab, string> = {
    overview: t.nav.overview,
    classes: `${t.nav.classes} (${sortedClasses.length})`,
    students: `${t.nav.students} (${students.length})`,
    teachers: `${t.nav.teachers} (${teachers.length})`,
    subscriptions: `Subscriptions (${subscriptions.length})`,
  };
  const show = (id: Tab) => visibleTabs.includes(id) && (activeTab === "overview" || activeTab === id);

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
            {isMa ? null : (
              <>
                {t.catalog.capacityCurrent}:{" "}
                <span className="font-semibold tabular-nums text-slate-900">{students.length}</span>
                <span className="mx-1.5 text-slate-300">·</span>
              </>
            )}
            {t.catalog.capacityMax}: <span className="font-semibold tabular-nums text-slate-900">{course.capacity ?? 12}</span>
            {isMa ? null : (
              <span className="crm-meta ml-1.5">
                ({fill(t.catalog.studentsFill, { n: students.length, cap: course.capacity ?? 12 })})
              </span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone={course.active ? "ok" : "warn"}>{course.active ? t.pages.open : t.pages.pausedCourse}</Badge>
            {isMa && course.code ? <Badge tone="neutral">{course.code}</Badge> : null}
            {branch ? <Badge tone="info">{branch.name}</Badge> : null}
            {room ? <Badge>{room.name}</Badge> : <Badge tone="neutral">No default room</Badge>}
            {renewSoon.length > 0 ? <Badge tone="danger">Renew {renewSoon.length}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMa && canGenerate && !maGenerated ? (
            <Button type="button" onClick={() => setGenOpen(true)}>
              {t.catalog.genCta}
            </Button>
          ) : null}
          {isMa && maGenerated ? (
            <Badge tone="ok">{t.catalog.genDone}</Badge>
          ) : null}
          {!isMa ? (
            <>
              <Link href="/schedule" className="crm-outline inline-flex h-10 items-center rounded-xl border-[1.5px] border-[var(--brand-500)] px-3.5 text-sm font-semibold text-[var(--brand-500)]">
                {t.nav.schedule}
              </Link>
              <Link href="/mid-course-enroll" className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-500)] px-3.5 text-sm font-semibold text-white">
                {t.nav.midEnroll}
              </Link>
            </>
          ) : null}
        </div>
      </header>

      {genOpen && isMa ? (
        <CourseGenerateClassesDrawer
          course={course}
          onClose={() => setGenOpen(false)}
          onDone={() => setMaTick((n) => n + 1)}
        />
      ) : null}

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--border)]" role="tablist">
        {visibleTabs.map((idTab) => (
          <button
            key={idTab}
            type="button"
            role="tab"
            aria-selected={activeTab === idTab}
            onClick={() => setTab(idTab)}
            className={cn(
              "shrink-0 -mb-px border-b-2 px-3 py-2.5 text-sm font-semibold text-[var(--foreground)]",
              activeTab === idTab ? "border-[var(--brand-500)]" : "border-transparent",
            )}
          >
            {tabLabel[idTab]}
          </button>
        ))}
      </div>

      <div key={activeTab} className={cn("crm-tab-panel mt-4", activeTab === "overview" && "space-y-8")}>
        {activeTab === "overview" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
              {(
                [
                  { label: t.nav.classes, n: String(sortedClasses.length), go: "classes" as Tab | null, wide: false },
                  ...(!isMa
                    ? [{ label: t.catalog.capacityCurrent, n: String(students.length), go: "students" as Tab | null, wide: false }]
                    : []),
                  { label: t.catalog.capacityMax, n: String(course.capacity ?? 12), go: null as Tab | null, wide: false },
                  { label: t.nav.teachers, n: String(teachers.length), go: "teachers" as Tab | null, wide: true },
                  ...(!isMa
                    ? [{ label: "Subscriptions", n: String(subscriptions.length), go: "subscriptions" as Tab | null, wide: true }]
                    : []),
                ]
              ).map((card) => {
                const className = cn(
                  "rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left md:col-span-1 md:p-4",
                  card.wide ? "col-span-3" : "col-span-2",
                );
                const body = (
                  <>
                    <p className="text-xs leading-snug text-[var(--muted)] md:text-sm">{card.label}</p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums leading-none text-slate-900 md:text-[2rem]">{card.n}</p>
                  </>
                );
                const go = card.go;
                if (go) {
                  return (
                    <button key={card.label} type="button" onClick={() => setTab(go)} className={`${className} hover:border-[var(--brand-300)]`}>
                      {body}
                    </button>
                  );
                }
                return (
                  <div key={card.label} className={className}>
                    {body}
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-slate-600">
              <p>{course.description || "—"}</p>
              <p className="mt-2 text-slate-400">
                {course.startDay} → {course.endDay} · {course.sessionCount} buổi · {t.catalog.capacityCurrent} {students.length} · {t.catalog.capacityMax} {course.capacity ?? 12}
              </p>
            </div>
          </div>
        ) : null}

        {show("classes") ? (
          <section>
            {activeTab === "overview" ? <h2 className="crm-section-title mb-3">{tabLabel.classes}</h2> : null}
            {isMa && canGenerate && !maGenerated ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-[var(--brand-300)] bg-[var(--brand-50)] px-4 py-3">
                <p className="text-sm text-[var(--brand-700,#3c3b87)]">{t.catalog.genLead}</p>
                <Button type="button" onClick={() => setGenOpen(true)}>
                  {t.catalog.genCta}
                </Button>
              </div>
            ) : null}
            {sortedClasses.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] bg-white px-4 py-6 text-sm text-slate-500">
                {isMa ? t.catalog.genLead : "—"}
              </p>
            ) : (
              <div className="overflow-auto rounded-xl border border-[var(--border)] bg-white">
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
                            {isMa ? (
                              <span className="font-semibold text-slate-800">{c.index}</span>
                            ) : (
                              <Link href={`/classes/${c.id}`} className="font-semibold text-[var(--brand-600)] hover:underline">{c.index}</Link>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-800">{c.day}</td>
                          <td className="px-3 py-2.5 text-slate-600">{c.start}–{c.end}</td>
                          <td className="px-3 py-2.5">
                            {teacher ? (
                              isMa ? (
                                teacher.name
                              ) : (
                                <Link href={`/teachers/${teacher.id}`} className="text-[var(--brand-600)] hover:underline">{teacher.name}</Link>
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{r ? r.name : "—"}</td>
                          <td className="px-3 py-2.5"><Badge tone={c.status === "cancelled" ? "danger" : c.status === "completed" ? "neutral" : "ok"}>{c.status}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {show("students") ? (
          <section>
            {activeTab === "overview" ? <h2 className="crm-section-title mb-3">{tabLabel.students}</h2> : null}
            <div className="overflow-auto rounded-xl border border-[var(--border)] bg-white">
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
          </section>
        ) : null}

        {show("teachers") ? (
          <section>
            {activeTab === "overview" ? <h2 className="crm-section-title mb-3">{tabLabel.teachers}</h2> : null}
            <ul className="space-y-2">
              {teachers.map((ct) => {
                const u = users.find((x) => x.id === ct.teacherId);
                if (!u) return null;
                const rowClass =
                  "flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3";
                const inner = (
                  <>
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: u.avatarColor }}
                    >
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{u.name}</span>
                      <span className="text-xs text-slate-500">{u.phone}</span>
                    </span>
                    <Badge tone={ct.role === "main" ? "ok" : "info"}>{ct.role}</Badge>
                  </>
                );
                return (
                  <li key={ct.id}>
                    {isMa ? (
                      <div className={rowClass}>{inner}</div>
                    ) : (
                      <Link
                        href={`/teachers/${u.id}`}
                        className={`${rowClass} hover:border-[var(--brand-300)]`}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {show("subscriptions") ? (
          <section>
            {activeTab === "overview" ? <h2 className="crm-section-title mb-3">{tabLabel.subscriptions}</h2> : null}
            <div className="overflow-auto rounded-xl border border-[var(--border)] bg-white">
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
