"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Star } from "lucide-react";
import { StudentDrawer } from "@/components/student-drawer";
import { Badge, Button, inputClass } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { setStudentsFlag } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { usePageQuery } from "@/lib/page-query";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { studentBadges } from "@/lib/student-badges";
import { cn, formatVnd, initials, isMinor, localDayKey, zaloHref } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Level, Student } from "@/types";

type StatusFilter = "all" | "studying" | "hold" | "paused" | "trial";
type SortKey = "name" | "branch" | "level" | "class" | "remain" | "debt" | "parent";

const PAGE_SIZE = 12;

function parentText(st: Student, seeContact: boolean) {
  const kid = isMinor(st.birthDay) || (!st.birthDay && Boolean(st.parentName));
  if (!kid || !st.parentName) return "—";
  return seeContact ? `${st.parentName} · ${st.parentPhone}` : st.parentName;
}

function remainTone(n: number) {
  if (n <= 3) return "font-semibold text-rose-600";
  if (n <= 5) return "font-semibold text-amber-600";
  return "font-semibold text-slate-800";
}

function addDays(base: string, delta: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

function exportCsv(rows: Student[], seeContact: boolean, seeMoney: boolean, className: (id: string) => string, branchName: (id: string) => string, header: string[]) {
  const lines = rows.map((st) => [
    st.name,
    seeContact ? st.phone : "",
    parentText(st, seeContact),
    branchName(st.branchId),
    levelLabel(st.level),
    className(st.courseId),
    String(st.remainingSessions),
    seeMoney ? String(st.debt) : "",
  ]);
  const csv = `\uFEFF${[header, ...lines].map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `hoc-vien-${localDayKey()}.csv`;
  a.click();
}

export default function StudentsPage() {
  const { lang, t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { branchId } = useStudioBranch();
  const [level, setLevel] = useState<Level | "all">("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [debt, setDebt] = useState<"all" | "yes">("all");
  const [low, setLow] = useState<"all" | "yes">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { student } = usePageQuery();
  const today = localDayKey();

  useEffect(() => {
    if (student) setOpenId(student);
  }, [student]);

  const branchStudents = useMemo(
    () => students.filter((st) => branchId === "all" || st.branchId === branchId),
    [students, branchId],
  );

  const kpis = useMemo(() => {
    const from30 = addDays(today, -30);
    const active = branchStudents.filter((s) => s.status === "active").length;
    const neu = branchStudents.filter((s) => s.joinedDay >= from30).length;
    const follow = branchStudents.filter((s) => s.remainingSessions <= 3 || s.flagged || s.debt > 0).length;
    const unpaid = branchStudents.filter((s) => s.debt > 0).length;
    return { total: branchStudents.length, neu, active, follow, unpaid };
  }, [branchStudents, today]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = students.filter((st) => {
      const approved = holds.some((h) => h.studentId === st.id && h.status === "approved");
      const pending = holds.some((h) => h.studentId === st.id && h.status === "pending");
      if (branchId !== "all" && st.branchId !== branchId) return false;
      if (level !== "all" && st.level !== level) return false;
      if (courseFilter !== "all" && st.courseId !== courseFilter) return false;
      if (status === "studying" && !(st.status === "active" && !approved)) return false;
      if (status === "hold" && !(approved || pending)) return false;
      if (status === "paused" && st.status !== "paused") return false;
      if (status === "trial" && st.status !== "trial") return false;
      if (debt === "yes" && st.debt <= 0) return false;
      if (low === "yes" && (st.remainingSessions > 3 || st.status === "paused")) return false;
      if (!s) return true;
      const blob = `${st.name} ${seeContact ? st.phone : ""} ${seeContact ? st.parentPhone : ""}`.toLowerCase();
      return blob.includes(s);
    });
    const value = (st: Student) => {
      if (sortKey === "branch") return branches.find((b) => b.id === st.branchId)?.name ?? "";
      if (sortKey === "level") return levelLabel(st.level);
      if (sortKey === "class") return courses.find((c) => c.id === st.courseId)?.name ?? "";
      if (sortKey === "remain") return st.remainingSessions;
      if (sortKey === "debt") return st.debt;
      if (sortKey === "parent") return parentText(st, seeContact);
      return st.name;
    };
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "vi") * dir;
    });
  }, [students, holds, q, status, courseFilter, branchId, level, debt, low, seeContact, sortKey, sortDir, branches, courses]);

  useEffect(() => {
    setPage(0);
  }, [q, status, courseFilter, branchId, level, debt, low]);

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

  const allChecked = paged.length > 0 && paged.every((st) => selected.includes(st.id));
  const picked = rows.filter((st) => selected.includes(st.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
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
    const url = new URL(window.location.href);
    url.searchParams.set("student", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function openZalo() {
    for (const st of picked) {
      const href = zaloHref(st.phone);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  const columns: { key: SortKey; label: string; show: boolean }[] = [
    { key: "name", label: t.nav.students, show: true },
    { key: "class", label: t.common.course, show: true },
    { key: "remain", label: t.students.remain, show: true },
    { key: "debt", label: t.students.badgeDebt, show: seeMoney },
    { key: "level", label: t.common.level, show: true },
  ];

  const kpiCards = [
    { label: t.students.kpiTotal, value: kpis.total },
    { label: t.students.kpiNew, value: kpis.neu },
    { label: t.students.kpiActive, value: kpis.active },
    { label: t.students.kpiFollow, value: kpis.follow },
    ...(seeMoney ? [{ label: t.students.kpiUnpaid, value: kpis.unpaid }] : []),
  ];

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
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--foreground)]">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <input className={`${inputClass} md:col-span-2 xl:col-span-2`} placeholder={seeContact ? t.students.search : t.students.searchName} value={q} onChange={(e) => setQ(e.target.value)} />
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
        <select className={inputClass} value={low} onChange={(e) => setLow(e.target.value as "all" | "yes")}>
          <option value="all">{t.students.remain}</option>
          <option value="yes">{t.students.lowRemain}</option>
        </select>
      </div>

      {picked.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2">
          <span className="text-sm font-semibold">{fill(t.students.selected, { n: picked.length })}</span>
          {seeContact ? <Button type="button" variant="outline" onClick={openZalo}>{t.students.sendZalo}</Button> : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => exportCsv(
              picked,
              seeContact,
              seeMoney,
              (id) => courses.find((c) => c.id === id)?.name ?? "",
              (id) => branches.find((b) => b.id === id)?.name ?? "",
              [t.common.student, t.students.phone, t.students.parent, t.common.branch, t.common.level, t.common.course, t.students.remain, t.students.debt],
            )}
          >
            {t.students.export}
          </Button>
          <Button type="button" variant="outline" onClick={() => void setStudentsFlag(picked.map((st) => st.id), !picked.every((st) => st.flagged))}>
            {t.students.flag}
          </Button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-stretch">
        <div className="flex min-h-0 flex-col rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <p className="text-sm text-slate-500">{t.students.empty}</p>
              <Link href="/mid-course-enroll" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white">
                {t.students.emptyCta}
              </Link>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-slate-50 text-left">
                    <tr>
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={t.students.selectAll}
                          checked={allChecked}
                          onChange={(e) => setSelected(e.target.checked ? paged.map((st) => st.id) : selected.filter((id) => !paged.some((st) => st.id === id)))}
                        />
                      </th>
                      {columns.filter((c) => c.show).map((c) => (
                        <th key={c.key} className={cn("px-3 py-3", c.key === "remain" || c.key === "debt" ? "text-right" : "")}>
                          <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort(c.key)}>
                            {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-3 font-semibold text-slate-600">{t.students.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((st) => {
                      const badges = studentBadges(st, holds, seeMoney, lang);
                      const on = openId === st.id;
                      return (
                        <tr
                          key={st.id}
                          className={cn(
                            "cursor-pointer border-t border-slate-100",
                            on ? "bg-[var(--brand-50)]" : "hover:bg-slate-50",
                          )}
                          onClick={() => pick(st.id)}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={fill(t.students.selectOne, { name: st.name })}
                              checked={selected.includes(st.id)}
                              onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, st.id] : cur.filter((id) => id !== st.id))}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.avatarColor }}>{initials(st.name)}</span>
                              <span>
                                <span className="flex items-center gap-1 font-semibold text-[var(--foreground)]">
                                  {st.name}
                                  {st.flagged ? <Star size={14} className="fill-amber-400 text-amber-500" aria-label={t.students.flagged} /> : null}
                                </span>
                                <span className="text-xs text-slate-400">{seeContact ? st.phone : t.common.noPhone}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{courses.find((c) => c.id === st.courseId)?.name ?? "—"}</td>
                          <td className={cn("px-3 py-3 text-right tabular-nums", remainTone(st.remainingSessions))}>{st.remainingSessions}</td>
                          {seeMoney ? <td className="px-3 py-3 text-right tabular-nums">{st.debt > 0 ? formatVnd(st.debt) : "—"}</td> : null}
                          <td className="px-3 py-3 text-slate-600">{levelLabel(st.level)}</td>
                          <td className="px-3 py-3">
                            <span className="flex flex-wrap gap-1">
                              {badges.slice(0, 2).map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
                <p className="text-xs text-slate-500">{fill(t.students.pageOf, { page: pageSafe + 1, pages: pageCount })}</p>
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
