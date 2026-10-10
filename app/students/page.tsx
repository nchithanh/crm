"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { MoreHorizontal, Star } from "lucide-react";
import { StudentDrawer } from "@/components/student-drawer";
import { Badge, Button, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { createTask } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { usePageQuery } from "@/lib/page-query";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { studentBadges } from "@/lib/student-badges";
import { cn, formatVnd, initials, localDayKey, zaloHref } from "@/lib/utils";
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
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [bulkMsg, setBulkMsg] = useState("");
  const { student } = usePageQuery();
  const today = localDayKey();

  useEffect(() => {
    if (student) setOpenId(student);
  }, [student]);

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
    if (openId && rows.length && !rows.some((r) => r.id === openId)) {
      setOpenId(null);
      return;
    }
    if (openId || !rows[0] || typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) setOpenId(rows[0].id);
  }, [rows, openId]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const paged = rows.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);
  const fromN = rows.length === 0 ? 0 : pageSafe * PAGE_SIZE + 1;
  const toN = Math.min(rows.length, pageSafe * PAGE_SIZE + paged.length);
  const allChecked = paged.length > 0 && paged.every((st) => selected.includes(st.id));
  const picked = rows.filter((st) => selected.includes(st.id));
  const showBranch = branchId === "all" && branchPick === "all";
  const teachers = users.filter((u) => u.role === "teacher");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

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
    setMenuId(null);
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

  const kpiCards: { id: KpiFilter; label: string; value: number; hint?: string }[] = [
    { id: "all", label: t.students.kpiTotal, value: kpis.total },
    {
      id: "new",
      label: t.students.kpiNew,
      value: kpis.neu,
      hint: `${kpis.neu - kpis.prevNeu >= 0 ? "↑" : "↓"} ${Math.abs(kpis.neu - kpis.prevNeu)}`,
    },
    { id: "active", label: t.students.kpiActive, value: kpis.active },
    { id: "follow", label: t.students.kpiFollow, value: kpis.follow },
    ...(seeMoney ? [{ id: "unpaid" as const, label: t.students.kpiUnpaid, value: kpis.unpaid }] : []),
  ];

  function courseLabel(st: Student) {
    const primary = courses.find((c) => c.id === st.courseId)?.name ?? "—";
    const extra = new Set((subsByStudent.get(st.id) ?? []).map((sub) => sub.courseId).filter((id) => id && id !== st.courseId));
    return { primary, extra: extra.size };
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.students.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{fill(t.students.count, { n: rows.length })}</p>
        </div>
        {seeMoney || seeContact ? (
          <Link href="/mid-course-enroll" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-600)]">
            {t.students.emptyCta}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map((k) => {
          const on = kpi === k.id || (k.id === "all" && kpi === "all");
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKpi(k.id)}
              className={cn(
                "rounded-[10px] border px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                on ? "border-[var(--brand-500)] bg-[var(--brand-50)]" : "border-[var(--border)] bg-[var(--card)]",
              )}
            >
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--foreground)]">{k.value}</p>
              {k.hint ? <p className={cn("text-xs tabular-nums", k.hint.startsWith("↑") ? "text-green-600" : "text-rose-600")}>{k.hint}</p> : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <input className={`${inputClass} md:col-span-2 xl:col-span-2`} placeholder={seeContact ? t.students.search : t.students.searchName} value={q} onChange={(e) => setQ(e.target.value)} />
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
        <select className={inputClass} value={debt} onChange={(e) => setDebt(e.target.value as "all" | "yes")} disabled={!seeMoney}>
          <option value="all">{t.students.debt}</option>
          <option value="yes">{t.students.hasDebt}</option>
        </select>
        <select className={inputClass} value={remain} onChange={(e) => setRemain(e.target.value as RemainFilter)}>
          <option value="all">{t.students.remain}</option>
          <option value="le3">{t.students.remainLe3}</option>
          <option value="le5">{t.students.remainLe5}</option>
          <option value="zero">{t.students.remainZero}</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setMore((v) => !v)}>{t.students.more}</Button>
        <Button type="button" variant="outline" onClick={() => download(rows)}>{t.students.export}</Button>
        <Button type="button" variant="ghost" onClick={clearFilters}>{t.students.clearFilters}</Button>
      </div>

      {more ? (
        <div className="grid gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-3 md:grid-cols-4">
          <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="all">{t.students.anyTeacher}</option>
            {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className={inputClass} value={attendBand} onChange={(e) => setAttendBand(e.target.value as "all" | "low")}>
            <option value="all">{t.students.anyAttend}</option>
            <option value="low">{t.students.attendLow}</option>
          </select>
          <label className="inline-flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
            {t.students.flaggedOnly}
          </label>
          <label className="inline-flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={holdOnly} onChange={(e) => setHoldOnly(e.target.checked)} />
            {t.students.onHoldOnly}
          </label>
        </div>
      ) : null}

      {picked.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2">
          <span className="text-sm font-semibold">{fill(t.students.selected, { n: picked.length })}</span>
          {seeContact ? <Button type="button" variant="outline" onClick={() => openZalo(picked)}>{t.students.message}</Button> : null}
          <Button type="button" variant="outline" onClick={() => void assignFollow(picked)}>{t.students.assignFollow}</Button>
          <Button type="button" variant="outline" onClick={() => download(picked)}>{t.students.export}</Button>
          <Button type="button" variant="ghost" onClick={() => setSelected([])}>{t.students.clearSelection}</Button>
          {bulkMsg ? <span className="text-sm text-green-700">{bulkMsg}</span> : null}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
        <div className="flex min-h-0 flex-col rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <p className="text-sm text-slate-500">{t.students.empty}</p>
              <Button type="button" className="mt-4" variant="outline" onClick={clearFilters}>{t.students.clearFilters}</Button>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-slate-50 text-left">
                    <tr>
                      <th className="sticky left-0 z-20 w-10 bg-slate-50 px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={t.students.selectAll}
                          checked={allChecked}
                          onChange={(e) => setSelected(e.target.checked ? [...new Set([...selected, ...paged.map((st) => st.id)])] : selected.filter((id) => !paged.some((st) => st.id === id)))}
                        />
                      </th>
                      <th className="sticky left-10 z-20 bg-slate-50 px-3 py-3">
                        <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort("name")}>{t.nav.students}{sortKey === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</button>
                      </th>
                      {showBranch ? <th className="px-3 py-3 font-semibold text-slate-600">{t.common.branch}</th> : null}
                      <th className="px-3 py-3 font-semibold text-slate-600">{t.common.course}</th>
                      <th className="px-3 py-3 font-semibold text-slate-600">{t.common.teacher}</th>
                      <th className="px-3 py-3 text-right">
                        <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort("remain")}>{t.students.remain}{sortKey === "remain" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-right">
                        <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort("attend")}>{t.students.attendCol}{sortKey === "attend" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</button>
                      </th>
                      {seeMoney ? (
                        <th className="px-3 py-3 text-right">
                          <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort("debt")}>{t.students.badgeDebt}{sortKey === "debt" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</button>
                        </th>
                      ) : null}
                      <th className="px-3 py-3 font-semibold text-slate-600">{t.students.status}</th>
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((st) => {
                      const badges = studentBadges(st, holds, seeMoney, lang);
                      const on = openId === st.id;
                      const course = courses.find((c) => c.id === st.courseId);
                      const teacher = teacherOf(course, users);
                      const label = courseLabel(st);
                      const rate = rateOf(marksByStudent.get(st.id) ?? []);
                      return (
                        <tr
                          key={st.id}
                          className={cn("cursor-pointer border-t border-slate-100", on ? "bg-[rgba(249,115,22,0.08)]" : "hover:bg-slate-50")}
                          onClick={() => pick(st.id)}
                        >
                          <td className={cn("sticky left-0 z-10 px-3 py-3", on ? "bg-[rgba(249,115,22,0.08)]" : "bg-white")} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={fill(t.students.selectOne, { name: st.name })}
                              checked={selected.includes(st.id)}
                              onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, st.id] : cur.filter((id) => id !== st.id))}
                            />
                          </td>
                          <td className={cn("sticky left-10 z-10 px-3 py-3", on ? "bg-[rgba(249,115,22,0.08)]" : "bg-white")}>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.avatarColor }}>{initials(st.name)}</span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-1 font-semibold text-[var(--foreground)]">
                                  {st.name}
                                  {st.flagged ? <Star size={14} className="fill-amber-400 text-amber-500" aria-label={t.students.flagged} /> : null}
                                </span>
                                <span className="block text-xs text-slate-400">{st.id}{seeContact ? ` · ${st.phone}` : ""}</span>
                              </span>
                            </div>
                          </td>
                          {showBranch ? <td className="px-3 py-3 text-slate-600">{branches.find((b) => b.id === st.branchId)?.name ?? "—"}</td> : null}
                          <td className="px-3 py-3 text-slate-700">
                            {label.primary}
                            {label.extra > 0 ? <span className="ml-1 text-xs text-slate-400">{fill(t.students.extraCourses, { n: label.extra })}</span> : null}
                          </td>
                          <td className="px-3 py-3">
                            {teacher ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: teacher.avatarColor }}>{initials(teacher.name)}</span>
                                <span className="text-slate-700">{teacher.name}</span>
                              </span>
                            ) : "—"}
                          </td>
                          <td className={cn("px-3 py-3 text-right tabular-nums", remainTone(st.remainingSessions))}>{st.remainingSessions}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700">{rate === null ? "—" : `${rate}%`}</td>
                          {seeMoney ? <td className="px-3 py-3 text-right tabular-nums">{st.debt > 0 ? formatVnd(st.debt) : "—"}</td> : null}
                          <td className="px-3 py-3">
                            <span className="flex flex-wrap gap-1">
                              {badges.slice(0, 3).map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
                            </span>
                          </td>
                          <td className="relative px-2 py-3" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.students.menu} onClick={() => setMenuId(menuId === st.id ? null : st.id)}>
                              <MoreHorizontal size={16} />
                            </button>
                            {menuId === st.id ? (
                              <div className="absolute right-2 z-30 mt-1 w-44 rounded-[10px] border border-[var(--border)] bg-white py-1 text-sm shadow-md">
                                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => pick(st.id)}>{t.students.view}</button>
                                {seeMoney ? <Link className="block px-3 py-2 hover:bg-slate-50" href={`/collect-fees?student=${st.id}`}>{t.students.collectQuick}</Link> : null}
                                {seeContact ? <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => openZalo([st])}>{t.students.message}</button> : null}
                                <Link className="block px-3 py-2 hover:bg-slate-50" href="/mid-course-enroll">{t.drawer.enrollMore}</Link>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

        <div className="hidden min-h-0 lg:block">
          {openId ? (
            <StudentDrawer key={openId} studentId={openId} onClose={closePanel} variant="panel" />
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 text-center text-sm text-slate-500">
              {t.students.pickHint}
            </div>
          )}
        </div>
      </div>

      {openId ? (
        <div className="lg:hidden">
          <StudentDrawer key={`m-${openId}`} studentId={openId} onClose={closePanel} variant="drawer" />
        </div>
      ) : null}
    </div>
  );
}
