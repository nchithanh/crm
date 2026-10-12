"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, UserPlus, UserRound, Users, Wallet } from "lucide-react";
import { StudentDrawer } from "@/components/student-drawer";
import { Badge, Button, ctaPrimary, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { createTask } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { usePageQuery } from "@/lib/page-query";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { studentBadges } from "@/lib/student-badges";
import { cn, initials, localDayKey, zaloHref } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Attendance, Course, Level, Student, Subscription, User } from "@/types";

type StatusFilter = "all" | "studying" | "hold" | "paused" | "trial";
type KpiFilter = "all" | "new" | "active" | "follow" | "unpaid";
type RemainFilter = "all" | "le3" | "le5" | "zero";
type SortKey = "name" | "remain" | "debt" | "attend";

const PAGE_SIZE = 20;

function addDays(base: string, delta: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

function remainTone(n: number) {
  if (n === 0) return "font-semibold text-slate-400";
  if (n <= 3) return "font-semibold text-rose-600";
  if (n <= 5) return "font-semibold text-amber-600";
  return "font-semibold tabular-nums text-slate-800";
}

function rateOf(rows: Attendance[]) {
  const counted = rows.filter((a) => !a.waived);
  if (counted.length === 0) return null;
  return Math.round((counted.filter((a) => a.status === "present").length / counted.length) * 100);
}

function onHold(studentId: string, holds: { studentId: string; status: string }[]) {
  return holds.some((h) => h.studentId === studentId && (h.status === "approved" || h.status === "pending"));
}

function teacherOf(course: Course | undefined, users: User[]) {
  return users.find((u) => u.id === course?.teacherId);
}

function exportCsv(
  rows: Student[],
  seeContact: boolean,
  seeMoney: boolean,
  courseName: (id: string) => string,
  branchName: (id: string) => string,
  rate: (id: string) => string,
  header: string[],
) {
  const lines = rows.map((st) => [
    st.id,
    st.name,
    seeContact ? st.phone : "",
    branchName(st.branchId),
    courseName(st.courseId),
    String(st.remainingSessions),
    rate(st.id),
    seeMoney ? String(st.debt) : "",
  ]);
  const csv = `\uFEFF${[header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `hoc-vien-${localDayKey()}.csv`;
  a.click();
}

export default function StudentsPage() {
  const { lang, t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { branchId } = useStudioBranch();
  const [branchPick, setBranchPick] = useState("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [debt, setDebt] = useState<"all" | "yes">("all");
  const [remain, setRemain] = useState<RemainFilter>("all");
  const [kpi, setKpi] = useState<KpiFilter>("all");
  const [more, setMore] = useState(false);
  const [teacherId, setTeacherId] = useState("all");
  const [attendBand, setAttendBand] = useState<"all" | "low">("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [holdOnly, setHoldOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const touchX = useRef(0);
  const touchMoved = useRef(false);
  const [page, setPage] = useState(0);
  const [bulkMsg, setBulkMsg] = useState("");
  const { student } = usePageQuery();
  const today = localDayKey();

  useEffect(() => {
    if (student) setOpenId(student);
  }, [student]);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);

  const marksByStudent = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const row of attendance) {
      if (row.subject !== "student") continue;
      const list = map.get(row.personId) ?? [];
      list.push(row);
      map.set(row.personId, list);
    }
    return map;
  }, [attendance]);

  const subsByStudent = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    for (const sub of subscriptions) {
      const list = map.get(sub.studentId) ?? [];
      list.push(sub);
      map.set(sub.studentId, list);
    }
    return map;
  }, [subscriptions]);

  const scoped = useMemo(() => {
    let rows = students;
    if (role === "teacher" && user) {
      const mine = new Set(courses.filter((c) => c.teacherId === user.id).map((c) => c.id));
      for (const klass of classes) {
        if (klass.teacherId === user.id) mine.add(klass.courseId);
      }
      rows = rows.filter((st) => mine.has(st.courseId));
    }
    return rows;
  }, [students, courses, classes, role, user]);

  const branchStudents = useMemo(() => {
    const id = branchId === "all" ? branchPick : branchId;
    return scoped.filter((st) => id === "all" || st.branchId === id);
  }, [scoped, branchId, branchPick]);

  const kpis = useMemo(() => {
    const from30 = addDays(today, -30);
    const prevFrom = addDays(today, -60);
    const active = branchStudents.filter((s) => s.status === "active").length;
    const neu = branchStudents.filter((s) => s.joinedDay >= from30).length;
    const prevNeu = branchStudents.filter((s) => s.joinedDay >= prevFrom && s.joinedDay < from30).length;
    const follow = branchStudents.filter((s) => s.remainingSessions <= 3 || s.flagged || s.debt > 0).length;
    const unpaid = branchStudents.filter((s) => s.debt > 0).length;
    return { total: branchStudents.length, neu, prevNeu, active, follow, unpaid };
  }, [branchStudents, today]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const from30 = addDays(today, -30);
    const filtered = branchStudents.filter((st) => {
      const held = onHold(st.id, holds);
      const approved = holds.some((h) => h.studentId === st.id && h.status === "approved");
      const pending = holds.some((h) => h.studentId === st.id && h.status === "pending");
      const course = courses.find((c) => c.id === st.courseId);
      const rate = rateOf(marksByStudent.get(st.id) ?? []);
      if (level !== "all" && st.level !== level) return false;
      if (courseFilter !== "all" && st.courseId !== courseFilter) return false;
      if (status === "studying" && !(st.status === "active" && !approved)) return false;
      if (status === "hold" && !(approved || pending)) return false;
      if (status === "paused" && st.status !== "paused") return false;
      if (status === "trial" && st.status !== "trial") return false;
      if (debt === "yes" && st.debt <= 0) return false;
      if (remain === "le3" && st.remainingSessions > 3) return false;
      if (remain === "le5" && st.remainingSessions > 5) return false;
      if (remain === "zero" && st.remainingSessions !== 0) return false;
      if (teacherId !== "all" && course?.teacherId !== teacherId) return false;
      if (attendBand === "low" && (rate === null || rate >= 70)) return false;
      if (flaggedOnly && !st.flagged) return false;
      if (holdOnly && !held) return false;
      if (kpi === "new" && st.joinedDay < from30) return false;
      if (kpi === "active" && st.status !== "active") return false;
      if (kpi === "follow" && !(st.remainingSessions <= 3 || st.flagged || st.debt > 0)) return false;
      if (kpi === "unpaid" && st.debt <= 0) return false;
      if (!s) return true;
      const blob = `${st.name} ${st.id} ${seeContact ? st.phone : ""} ${seeContact ? st.parentPhone : ""}`.toLowerCase();
      return blob.includes(s);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "remain") return (a.remainingSessions - b.remainingSessions) * dir;
      if (sortKey === "debt") return (a.debt - b.debt) * dir;
      if (sortKey === "attend") return ((rateOf(marksByStudent.get(a.id) ?? []) ?? -1) - (rateOf(marksByStudent.get(b.id) ?? []) ?? -1)) * dir;
      return a.name.localeCompare(b.name, "vi") * dir;
    });
  }, [branchStudents, holds, courses, q, status, courseFilter, level, debt, remain, seeContact, sortKey, sortDir, marksByStudent, teacherId, attendBand, flaggedOnly, holdOnly, kpi, today]);

  useEffect(() => {
    setPage(0);
  }, [q, status, courseFilter, branchId, branchPick, level, debt, remain, kpi, teacherId, attendBand, flaggedOnly, holdOnly]);

  useEffect(() => {
    if (openId && rows.length && !rows.some((r) => r.id === openId)) setOpenId(null);
  }, [rows, openId]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const paged = rows.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);
  const fromN = rows.length === 0 ? 0 : pageSafe * PAGE_SIZE + 1;
  const toN = Math.min(rows.length, pageSafe * PAGE_SIZE + paged.length);
  const picked = rows.filter((st) => selected.includes(st.id));
  const teachers = users.filter((u) => u.role === "teacher");

  function closePanel() {
    setOpenId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("student")) {
      url.searchParams.delete("student");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }

  function pick(id: string) {
    setOpenId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("student", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function clearFilters() {
    setQ("");
    setStatus("all");
    setBranchPick("all");
    setLevel("all");
    setCourseFilter("all");
    setDebt("all");
    setRemain("all");
    setKpi("all");
    setTeacherId("all");
    setAttendBand("all");
    setFlaggedOnly(false);
    setHoldOnly(false);
  }

  function openZalo(list: Student[]) {
    for (const st of list) {
      const href = zaloHref(seeContact ? st.phone : "");
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  async function assignFollow(list: Student[]) {
    for (const st of list) {
      await createTask({
        title: `${t.students.kpiFollow}: ${st.name}`,
        priority: st.remainingSessions <= 3 || st.debt > 0 ? "high" : "medium",
        branchId: st.branchId,
        dueDay: today,
        note: st.id,
      });
    }
    setBulkMsg(t.students.followDone);
    setSelected([]);
  }

  function download(list: Student[]) {
    exportCsv(
      list,
      seeContact,
      seeMoney,
      (id) => courses.find((c) => c.id === id)?.name ?? "",
      (id) => branches.find((b) => b.id === id)?.name ?? "",
      (id) => {
        const rate = rateOf(marksByStudent.get(id) ?? []);
        return rate === null ? "" : `${rate}%`;
      },
      ["ID", t.common.student, t.students.phone, t.common.branch, t.common.course, t.students.remain, t.students.attendCol, t.students.debt],
    );
  }

  function courseLabel(st: Student) {
    const ids = [st.courseId, ...(subsByStudent.get(st.id) ?? []).map((sub) => sub.courseId)];
    const names = [...new Set(ids.filter(Boolean))]
      .map((id) => courses.find((c) => c.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    return { primary: names[0] ?? "—", extra: Math.max(0, names.length - 1), names: names.join(", ") || "—" };
  }

  const canEnroll = role === "owner" || role === "reception";
  const chip = holdOnly ? "hold" : remain === "le3" ? "low" : kpi === "unpaid" ? "unpaid" : kpi === "active" ? "active" : kpi === "all" ? "all" : "none";
  const chips: { id: "all" | "active" | "unpaid" | "low" | "hold"; label: string }[] = [
    { id: "all", label: t.students.kpiTotal },
    { id: "active", label: t.students.kpiActive },
    ...(seeMoney ? [{ id: "unpaid" as const, label: t.students.kpiUnpaid }] : []),
    { id: "low", label: t.students.remainLe3 },
    { id: "hold", label: t.students.onHoldOnly },
  ];
  const homeKpis: { id: KpiFilter | "hold"; label: string; value: number; hint?: string }[] = [
    { id: "all", label: t.students.kpiTotal, value: kpis.total },
    { id: "active", label: t.students.kpiActive, value: kpis.active },
    seeMoney
      ? { id: "unpaid", label: t.students.kpiUnpaid, value: kpis.unpaid }
      : { id: "follow", label: t.students.kpiFollow, value: kpis.follow },
    {
      id: "new",
      label: t.students.kpiNew,
      value: kpis.neu,
      hint: `${kpis.neu - kpis.prevNeu >= 0 ? "↑" : "↓"} ${Math.abs(kpis.neu - kpis.prevNeu)}`,
    },
  ];

  function setChip(id: "all" | "active" | "unpaid" | "low" | "hold") {
    setHoldOnly(id === "hold");
    setRemain(id === "low" ? "le3" : "all");
    setKpi(id === "active" ? "active" : id === "unpaid" ? "unpaid" : "all");
    setDebt("all");
    setStatus("all");
  }

  const listCols =
    seeMoney && seeContact
      ? "lg:grid-cols-[1.75rem_minmax(7.5rem,10rem)_minmax(8rem,12rem)_minmax(7rem,9.5rem)_minmax(5.5rem,1fr)_minmax(4.25rem,0.7fr)_minmax(6rem,1fr)_minmax(6.5rem,1fr)_minmax(4.75rem,0.8fr)]"
      : seeMoney
        ? "lg:grid-cols-[1.75rem_minmax(7.5rem,11rem)_minmax(8rem,13rem)_minmax(7rem,10rem)_minmax(5.5rem,1fr)_minmax(4.25rem,0.7fr)_minmax(6rem,1fr)_minmax(5rem,0.9fr)]"
        : seeContact
          ? "lg:grid-cols-[1.75rem_minmax(7.5rem,11rem)_minmax(8rem,13rem)_minmax(7rem,10rem)_minmax(5.5rem,1fr)_minmax(4.25rem,0.7fr)_minmax(6.5rem,1.1fr)_minmax(5rem,0.9fr)]"
          : "lg:grid-cols-[1.75rem_minmax(8rem,12rem)_minmax(8rem,14rem)_minmax(7rem,11rem)_minmax(5.5rem,1fr)_minmax(4.5rem,0.8fr)_minmax(5rem,0.9fr)]";

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.students.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{fill(t.students.count, { n: rows.length })}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
      <label className="flex h-12 items-center gap-2 rounded-[5px] bg-[var(--search)] px-4 text-sm text-[var(--muted)]">
        <Search size={18} />
        <input
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none"
          placeholder={seeContact ? t.students.search : t.students.searchName}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {homeKpis.map((k) => {
          const on = k.id === "hold" ? holdOnly : kpi === k.id && !holdOnly;
          const tone = k.id === "unpaid" || k.id === "follow" ? "bg-rose-100 text-rose-600" : k.id === "active" ? "bg-sky-100 text-sky-600" : k.id === "new" ? "bg-green-100 text-green-700" : k.id === "hold" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-600";
          const Icon = k.id === "unpaid" || k.id === "follow" ? Wallet : k.id === "active" ? UserRound : k.id === "new" ? UserPlus : Users;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => { if (k.id === "hold") setChip("hold"); else { setChip("all"); setKpi(k.id); } }}
              className={cn(
                "rounded-[5px] border bg-[var(--panel)] p-3 text-left",
                on ? "border-[var(--brand-300)]" : "border-[var(--border)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-1 text-xl font-extrabold tabular-nums leading-tight text-[var(--foreground)]">{k.value}</p>
              {k.hint ? (
                <p className={`mt-1 text-xs tabular-nums ${k.hint.startsWith("↑") ? "text-green-600" : k.hint.startsWith("↓") ? "text-rose-600" : "text-slate-400"}`}>{k.hint}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="crm-x-scroll flex gap-2 pb-1">
        {chips.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setChip(item.id)}
            className={cn(
              "h-9 shrink-0 rounded-[5px] px-4 text-sm font-semibold",
              chip === item.id ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-white text-[var(--muted)]",
            )}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="h-9 shrink-0 rounded-[5px] border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted)]" onClick={() => setMore((v) => !v)}>{t.students.more}</button>
      </div>

      {more ? (
        <div className="grid gap-2 rounded-[5px] border border-[var(--border)] bg-white p-4 md:grid-cols-3">
          {branchId === "all" ? (
            <select className={inputClass} value={branchPick} onChange={(e) => setBranchPick(e.target.value)}>
              <option value="all">{t.common.branch}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          ) : null}
          <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level | "all")}>
            <option value="all">{t.common.level}</option>
            <option value="begin">Begin</option>
            <option value="inter">Inter</option>
            <option value="advance">Advance</option>
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">{t.common.status}</option>
            <option value="studying">{t.students.badgeStudy}</option>
            <option value="hold">{t.students.hold}</option>
            <option value="paused">{t.students.paused}</option>
            <option value="trial">{t.status.trial}</option>
          </select>
          <select className={inputClass} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">{t.common.course}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="all">{t.students.anyTeacher}</option>
            {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className={inputClass} value={attendBand} onChange={(e) => setAttendBand(e.target.value as "all" | "low")}>
            <option value="all">{t.students.anyAttend}</option>
            <option value="low">{t.students.attendLow}</option>
          </select>
          <label className="inline-flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
            {t.students.flaggedOnly}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => download(rows)}>{t.students.export}</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>{t.students.clearFilters}</Button>
          </div>
        </div>
      ) : null}

      {picked.length > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 lg:right-20 lg:bottom-6 lg:left-[276px]">
          <span className="text-sm font-semibold">{fill(t.students.selected, { n: picked.length })}</span>
          {seeContact ? <Button type="button" variant="outline" onClick={() => openZalo(picked)}>{t.students.message}</Button> : null}
          <Button type="button" variant="outline" onClick={() => void assignFollow(picked)}>{t.students.assignFollow}</Button>
          <Button type="button" variant="outline" onClick={() => download(picked)}>{t.students.export}</Button>
          <Button type="button" variant="ghost" onClick={() => setSelected([])}>{t.students.clearSelection}</Button>
          {bulkMsg ? <span className="text-sm text-green-700">{bulkMsg}</span> : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--card)]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              {branchStudents.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{t.students.emptyNone}</p>
                  <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{t.students.emptyNoneLead}</p>
                  {canEnroll ? (
                    <Link href="/mid-course-enroll" className={cn(ctaPrimary, "mt-4")}>{t.students.emptyCta}</Link>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">{t.students.empty}</p>
                  <Button type="button" className="mt-4" variant="outline" onClick={clearFilters}>{t.students.clearFilters}</Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <ul className="divide-y divide-[var(--border)]">
                  <li className={cn("hidden items-center gap-x-3 px-3 py-2 text-xs font-semibold text-[var(--muted)] lg:grid", listCols)}>
                    <span />
                    <span>{t.common.student}</span>
                    <span>{t.common.course}</span>
                    <span>{t.common.teacher}</span>
                    <span>{t.drawer.attendRate}</span>
                    <span>{t.students.remain}</span>
                    {seeMoney ? <span>{t.students.pay}</span> : null}
                    {seeContact ? <span>{t.students.contact}</span> : null}
                    <span>{t.common.status}</span>
                  </li>
                  {paged.map((st) => {
                    const badges = studentBadges(st, holds, seeMoney, lang);
                    const on = openId === st.id;
                    const label = courseLabel(st);
                    const pill = badges[0];
                    const course = courses.find((c) => c.id === st.courseId);
                    const teacher = users.find((u) => u.id === course?.teacherId);
                    const rate = rateOf(marksByStudent.get(st.id) ?? []);
                    const phone = seeContact ? st.phone.trim() : "";
                    const swipeShift = phone ? "-13.5rem" : "-4.5rem";
                    return (
                      <li key={st.id} className="relative overflow-hidden">
                        <div className="absolute inset-y-0 right-0 flex lg:hidden">
                          {phone ? (
                            <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex w-[4.5rem] items-center justify-center bg-green-600 px-1 text-center text-[11px] font-semibold text-white">{t.task.call}</a>
                          ) : null}
                          {phone ? (
                            <a href={zaloHref(phone) || "#"} target="_blank" rel="noreferrer" className="flex w-[4.5rem] items-center justify-center bg-sky-600 px-1 text-center text-[11px] font-semibold text-white">{t.task.zalo}</a>
                          ) : null}
                          <Link href="/attendance" className="flex w-[4.5rem] items-center justify-center bg-[var(--brand-600)] px-1 text-center text-[11px] font-semibold text-white">{t.header.attend}</Link>
                        </div>
                        <div
                          data-swipe={swipeId === st.id ? "open" : "closed"}
                          style={{ "--swipe": swipeShift } as CSSProperties}
                          className={cn("relative grid cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_5.75rem] items-center gap-x-2 bg-[var(--card)] px-3 py-3 transition-transform max-lg:touch-pan-y max-lg:data-[swipe=open]:translate-x-[var(--swipe)] lg:gap-x-3", listCols, on && "bg-[var(--brand-50)]")}
                          onTouchStart={(e) => {
                            touchX.current = e.changedTouches[0]?.clientX ?? 0;
                            touchMoved.current = false;
                          }}
                          onTouchEnd={(e) => {
                            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
                            if (dx < -48) {
                              touchMoved.current = true;
                              setSwipeId(st.id);
                            } else if (dx > 48) {
                              touchMoved.current = true;
                              setSwipeId((cur) => (cur === st.id ? null : cur));
                            }
                          }}
                          onClick={() => {
                            if (touchMoved.current) {
                              touchMoved.current = false;
                              return;
                            }
                            setSwipeId(null);
                            pick(st.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            aria-label={fill(t.students.selectOne, { name: st.name })}
                            checked={selected.includes(st.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, st.id] : cur.filter((id) => id !== st.id))}
                          />
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: st.avatarColor }}>{initials(st.name)}</span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[var(--foreground)]">{st.name}</span>
                              <span className="block truncate text-xs text-[var(--muted)] lg:hidden">{label.primary} · {fill(t.drawer.sessionsLeft, { n: st.remainingSessions })}</span>
                            </span>
                          </span>
                          <span className="flex flex-col items-start gap-1 lg:hidden">
                            {badges.map((badge) => (
                              <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
                            ))}
                          </span>
                          <span className="hidden text-sm leading-snug lg:line-clamp-2">{label.names}</span>
                          <span className="hidden min-w-0 items-center gap-2 lg:flex">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: teacher?.avatarColor ?? "var(--brand-500)" }}>{teacher ? initials(teacher.name) : "—"}</span>
                            <span className="truncate text-sm">{teacher?.name ?? "—"}</span>
                          </span>
                          <span className="hidden tabular-nums text-sm font-semibold lg:block">{rate === null ? "—" : `${rate}%`}</span>
                          <span className={cn("hidden tabular-nums lg:block", remainTone(st.remainingSessions))}>{st.remainingSessions}</span>
                          {seeMoney ? (
                            <span className="hidden lg:block">
                              <Badge tone={st.debt > 0 ? "warn" : "ok"}>{st.debt > 0 ? t.students.kpiUnpaid : t.students.paid}</Badge>
                            </span>
                          ) : null}
                          {seeContact ? <span className="hidden truncate text-sm tabular-nums lg:block">{st.phone || "—"}</span> : null}
                          <span className="hidden lg:block">{pill ? <Badge tone={pill.tone}>{pill.label}</Badge> : "—"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
                <p className="text-xs text-slate-500">{fill(t.students.range, { from: fromN, to: toN, total: rows.length })}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={pageSafe <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>{t.students.prev}</Button>
                  <Button type="button" variant="outline" disabled={pageSafe >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>{t.students.next}</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {openId ? (
        <StudentDrawer key={openId} studentId={openId} onClose={closePanel} />
      ) : null}
      {canEnroll ? (
        <Link
          href="/mid-course-enroll"
          aria-label={t.students.emptyCta}
          className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-500)] text-white lg:hidden"
        >
          <Plus size={24} />
        </Link>
      ) : null}
    </div>
  );
}
