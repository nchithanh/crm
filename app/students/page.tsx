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
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const holds = useLiveQuery(() => db.holds.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { branchId } = useStudioBranch();
  const [level, setLevel] = useState<Level | "all">("all");
  const [classId, setClassId] = useState("all");
  const [debt, setDebt] = useState<"all" | "yes">("all");
  const [low, setLow] = useState<"all" | "yes">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const { student } = usePageQuery();

  useEffect(() => {
    if (student) setOpenId(student);
  }, [student]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = students.filter((st) => {
      const approved = holds.some((h) => h.studentId === st.id && h.status === "approved");
      const pending = holds.some((h) => h.studentId === st.id && h.status === "pending");
      if (branchId !== "all" && st.branchId !== branchId) return false;
      if (level !== "all" && st.level !== level) return false;
      if (classId !== "all" && st.courseId !== classId) return false;
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
      if (sortKey === "class") return classes.find((c) => c.id === st.courseId)?.name ?? "";
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
  }, [students, holds, q, status, classId, branchId, level, debt, low, seeContact, sortKey, sortDir, branches, classes]);

  const allChecked = rows.length > 0 && rows.every((st) => selected.includes(st.id));
  const picked = rows.filter((st) => selected.includes(st.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function closeDrawer() {
    setOpenId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("student")) {
      url.searchParams.delete("student");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }

  function openZalo() {
    for (const st of picked) {
      const href = zaloHref(st.phone);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  const columns: { key: SortKey; label: string; show: boolean }[] = [
    { key: "name", label: t.nav.students, show: true },
    { key: "branch", label: t.common.branch, show: true },
    { key: "level", label: t.common.level, show: true },
    { key: "class", label: t.common.class, show: true },
    { key: "remain", label: t.students.remain, show: true },
    { key: "debt", label: t.students.badgeDebt, show: seeMoney },
    { key: "parent", label: t.students.parent, show: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.students.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{fill(t.students.count, { n: rows.length })}</p>
        </div>
        {seeMoney || seeContact ? (
          <Link href="/enroll" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-600)]">
            {t.students.emptyCta}
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
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
        <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="all">{t.common.class}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <span className="text-sm font-semibold text-slate-800">{fill(t.students.selected, { n: picked.length })}</span>
          {seeContact ? <Button type="button" variant="outline" onClick={openZalo}>{t.students.sendZalo}</Button> : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => exportCsv(
              picked,
              seeContact,
              seeMoney,
              (id) => classes.find((c) => c.id === id)?.name ?? "",
              (id) => branches.find((b) => b.id === id)?.name ?? "",
              [t.common.student, t.students.phone, t.students.parent, t.common.branch, t.common.level, t.common.class, t.students.remain, t.students.debt],
            )}
          >
            {t.students.export}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void setStudentsFlag(picked.map((st) => st.id), !picked.every((st) => st.flagged))}
          >
            {t.students.flag}
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[12px] border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center">
          <p className="text-sm text-slate-500">{t.students.empty}</p>
          <Link href="/enroll" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-600)]">
            {t.students.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="mt-4 max-h-[min(70dvh,760px)] overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-slate-50 text-left">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={t.students.selectAll}
                    checked={allChecked}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((st) => st.id) : [])}
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
                <th className="w-36 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((st) => {
                const badges = studentBadges(st, holds, seeMoney, lang);
                return (
                  <tr
                    key={st.id}
                    className="group cursor-pointer border-t border-slate-100 hover:bg-[var(--brand-50)]"
                    onClick={() => setOpenId(st.id)}
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
                      <div className="flex items-center gap-2 text-left">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.avatarColor }}>{initials(st.name)}</span>
                        <span>
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            {st.name}
                            {st.flagged ? <Star size={14} className="fill-amber-400 text-amber-500" aria-label={t.students.flagged} /> : null}
                          </span>
                          <span className="text-xs text-slate-400">{seeContact ? st.phone : t.common.noPhone}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{branches.find((b) => b.id === st.branchId)?.name}</td>
                    <td className="px-3 py-3 text-slate-600">{levelLabel(st.level)}</td>
                    <td className="px-3 py-3 text-slate-600">{classes.find((c) => c.id === st.courseId)?.name}</td>
                    <td className={cn("px-3 py-3 text-right tabular-nums", remainTone(st.remainingSessions))}>{st.remainingSessions}</td>
                    {seeMoney ? <td className="px-3 py-3 text-right tabular-nums text-slate-700">{st.debt > 0 ? formatVnd(st.debt) : "—"}</td> : null}
                    <td className="px-3 py-3 text-slate-600">{parentText(st, seeContact)}</td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1">
                        {badges.map((b) => <Badge key={b.label + b.tone} tone={b.tone}>{b.label}</Badge>)}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                        <button type="button" className="text-xs font-semibold text-[var(--brand-600)]" onClick={() => setOpenId(st.id)}>
                          {t.students.view}
                        </button>
                        {seeMoney ? (
                          <Link href={`/fees?student=${st.id}`} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                            {t.students.collectQuick}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {openId ? <StudentDrawer key={openId} studentId={openId} onClose={closeDrawer} /> : null}
    </div>
  );
}
