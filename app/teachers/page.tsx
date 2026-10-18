"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { TeacherDrawer } from "@/components/teacher-drawer";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canManageCatalog, canSeeContact } from "@/lib/access";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { levelLabel } from "@/lib/rules";
import { cn, initials, localDayKey } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import type { Level, TeacherStatus, User } from "@/types";

type StatusFilter = "all" | TeacherStatus;
type SortKey = "name" | "branch" | "classes" | "week" | "status";

const LEVELS: Level[] = ["begin", "inter", "advance"];
const STATUSES: TeacherStatus[] = ["active", "paused", "left"];

function weekBounds(base = new Date()) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const wd = d.getDay();
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: localDayKey(start), to: localDayKey(end) };
}

function statusTone(status: TeacherStatus): "ok" | "warn" | "neutral" {
  if (status === "active") return "ok";
  if (status === "paused") return "warn";
  return "neutral";
}

export default function TeachersPage() {
  const { t } = useI18n();
  const canEdit = canManageCatalog(useAuthStore((s) => s.user?.role));
  const seeContact = canSeeContact(useAuthStore((s) => s.user?.role));
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [q, setQ] = useState("");
  const [style, setStyle] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("teacher");
    if (id) setOpenId(id);
  }, []);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const teachers = users.filter((u) => u.role === "teacher");
  const styleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) if (c.style) set.add(c.style);
    for (const u of teachers) for (const s of u.styles ?? []) set.add(s);
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [courses, teachers]);

  const week = weekBounds();

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = teachers.filter((u) => {
      if (branchId !== "all" && u.branchId !== branchId) return false;
      if (status !== "all" && (u.teacherStatus ?? "active") !== status) return false;
      if (style !== "all" && !(u.styles ?? []).includes(style)) return false;
      if (!s) return true;
      return `${u.name} ${u.phone} ${u.email}`.toLowerCase().includes(s);
    });
    const classCount = (id: string) => classes.filter((c) => c.teacherId === id).length;
    const weekCount = (id: string) =>
      sessions.filter((x) => x.teacherId === id && x.day >= week.from && x.day <= week.to && x.status !== "cancelled").length;
    const studentCount = (id: string) => {
      const mine = new Set(courses.filter((c) => c.teacherId === id).map((c) => c.id));
      return students.filter((st) => st.status !== "paused" && mine.has(st.courseId)).length;
    };
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "branch") {
        const an = branches.find((x) => x.id === a.branchId)?.name ?? "";
        const bn = branches.find((x) => x.id === b.branchId)?.name ?? "";
        return an.localeCompare(bn, "vi") * dir;
      }
      if (sortKey === "classes") return (classCount(a.id) - classCount(b.id)) * dir;
      if (sortKey === "week") return (weekCount(a.id) - weekCount(b.id)) * dir;
      if (sortKey === "status") return (a.teacherStatus ?? "active").localeCompare(b.teacherStatus ?? "active") * dir;
      return a.name.localeCompare(b.name, "vi") * dir;
    }).map((u) => ({
      teacher: u,
      classCount: classCount(u.id),
      weekCount: weekCount(u.id),
      studentCount: studentCount(u.id),
    }));
  }, [teachers, q, status, style, branchId, sortKey, sortDir, branches, classes, sessions, courses, students, week.from, week.to]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function openCreate() {
    setEditId(null);
    setFormMode("create");
  }

  function openEdit(id: string) {
    setEditId(id);
    setFormMode("edit");
    setOpenId(null);
  }

  const editing = editId ? teachers.find((u) => u.id === editId) : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="crm-page-title">{t.teachers.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{fill(t.teachers.count, { n: rows.length })}</p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={openCreate}>{t.teachers.add}</Button>
        ) : (
          <p className="text-sm text-slate-500">{t.catalog.viewOnly}</p>
        )}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
        <input className={`${inputClass} md:col-span-2`} placeholder={t.teachers.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="all">{t.teachers.styles}</option>
          {styleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">{t.common.status}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t.teachers.status[s]}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
          <p className="text-sm text-slate-500">{t.teachers.empty}</p>
          {canEdit ? (
            <Button type="button" className="mt-4" onClick={openCreate}>{t.teachers.add}</Button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <li className={cn("hidden items-center gap-x-3 px-4 py-2 text-xs font-semibold text-[var(--muted)] lg:grid", seeContact ? "lg:grid-cols-[minmax(8rem,1.2fr)_minmax(6rem,0.7fr)_minmax(6.5rem,0.8fr)_minmax(6rem,0.9fr)_4.5rem_5.5rem_4.5rem_5.5rem]" : "lg:grid-cols-[minmax(8rem,1.3fr)_minmax(6rem,0.8fr)_minmax(6rem,1fr)_4.5rem_5.5rem_4.5rem_5.5rem]")}>
            <span>{t.teachers.name}</span>
            <span>{t.common.branch}</span>
            {seeContact ? <span>{t.students.phone}</span> : null}
            <span>{t.teachers.styles}</span>
            <span>{t.teachers.classes}</span>
            <span>{t.teachers.perWeek}</span>
            <span>{t.nav.students}</span>
            <span>{t.common.status}</span>
          </li>
          {rows.map(({ teacher, classCount, weekCount, studentCount }) => {
            const st = teacher.teacherStatus ?? "active";
            return (
              <li key={teacher.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(teacher.id)}
                  className={cn("grid w-full grid-cols-[minmax(0,1fr)_6rem] items-center gap-x-2 px-3 py-4 text-left hover:bg-black/5 lg:gap-x-3 lg:px-4", seeContact ? "lg:grid-cols-[minmax(8rem,1.2fr)_minmax(6rem,0.7fr)_minmax(6.5rem,0.8fr)_minmax(6rem,0.9fr)_4.5rem_5.5rem_4.5rem_5.5rem]" : "lg:grid-cols-[minmax(8rem,1.3fr)_minmax(6rem,0.8fr)_minmax(6rem,1fr)_4.5rem_5.5rem_4.5rem_5.5rem]")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: teacher.avatarColor }}>
                      {initials(teacher.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-[var(--foreground)]">{teacher.name}</span>
                      <span className="mt-0.5 block truncate text-sm text-[var(--muted)] lg:hidden">
                        {branches.find((b) => b.id === teacher.branchId)?.name ?? "—"} · {weekCount} {t.teachers.perWeek} · {studentCount} {t.nav.students}
                      </span>
                      {(teacher.styles ?? []).length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1 lg:hidden">
                          {(teacher.styles ?? []).slice(0, 2).map((s) => <Badge key={s} tone="info">{s}</Badge>)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="lg:hidden"><Badge tone={statusTone(st)}>{t.teachers.status[st]}</Badge></span>
                  <span className="hidden truncate text-sm lg:block">{branches.find((b) => b.id === teacher.branchId)?.name ?? "—"}</span>
                  {seeContact ? <span className="hidden truncate text-sm tabular-nums lg:block">{teacher.phone || "—"}</span> : null}
                  <span className="hidden flex-wrap gap-1 lg:flex">
                    {(teacher.styles ?? []).slice(0, 2).map((s) => <Badge key={s} tone="info">{s}</Badge>)}
                    {(teacher.styles ?? []).length === 0 ? <span className="text-sm text-[var(--muted)]">—</span> : null}
                  </span>
                  <span className="hidden tabular-nums text-sm lg:block">{classCount}</span>
                  <span className="hidden tabular-nums text-sm lg:block">{weekCount}</span>
                  <span className="hidden tabular-nums text-sm lg:block">{studentCount}</span>
                  <span className="hidden lg:block"><Badge tone={statusTone(st)}>{t.teachers.status[st]}</Badge></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openId ? (
        <TeacherDrawer
          key={openId}
          teacherId={openId}
          onClose={() => setOpenId(null)}
          onEdit={canEdit ? openEdit : undefined}
        />
      ) : null}

      {formMode ? (
        <TeacherFormDrawer
          teacher={formMode === "edit" ? editing : undefined}
          branches={branches}
          styleOptions={styleOptions}
          onClose={() => { setFormMode(null); setEditId(null); }}
          onSaved={(id) => {
            setFormMode(null);
            setEditId(null);
            setOpenId(id);
          }}
        />
      ) : null}
    </div>
  );
}

function TeacherFormDrawer({
  teacher,
  branches,
  styleOptions,
  onClose,
  onSaved,
}: {
  teacher?: User;
  branches: { id: string; name: string }[];
  styleOptions: string[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(teacher?.name ?? "");
  const [phone, setPhone] = useState(teacher?.phone ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [branchId, setBranchId] = useState(teacher?.branchId ?? branches[0]?.id ?? "");
  const [styles, setStyles] = useState<string[]>(teacher?.styles ?? []);
  const [levels, setLevels] = useState<Level[]>(teacher?.levels ?? []);
  const [teacherStatus, setTeacherStatus] = useState<TeacherStatus>(teacher?.teacherStatus ?? "active");
  const [note, setNote] = useState(teacher?.note ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleStyle(s: string) {
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function toggleLevel(l: Level) {
    setLevels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  async function save() {
    setBusy(true);
    setError("");
    const payload = {
      name,
      phone,
      email,
      branchId,
      styles,
      levels,
      teacherStatus,
      note,
      pin: pin.trim() || undefined,
    };
    const code = teacher
      ? await updateTeacher({ id: teacher.id, ...payload, teacherStatus })
      : await createTeacher(payload);
    setBusy(false);
    if (code === "skills") {
      setError(t.teachers.needSkills);
      return;
    }
    if (code === "pin") {
      setError(t.teachers.needPin);
      return;
    }
    if (code === "fields") {
      setError(t.teachers.needFields);
      return;
    }
    onSaved(teacher?.id ?? code);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.common.close} onClick={onClose} />
      <aside className="relative flex h-full w-[80%] max-w-[34rem] flex-col bg-[var(--card)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{teacher ? t.teachers.edit : t.teachers.add}</h2>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100" aria-label={t.common.close} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Field label={t.teachers.name}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t.catalog.phone}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t.common.branch}>
            <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <div>
            <p className="text-sm text-slate-500">{t.teachers.styles}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {styleOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStyle(s)}
                  className={cn(
                    "rounded-xl border px-2.5 py-1.5 text-sm font-medium",
                    styles.includes(s) ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] text-slate-600",
                  )}
                >
                  {s}
                </button>
              ))}
              {styleOptions.length === 0 ? <p className="text-sm text-slate-400">—</p> : null}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">{t.teachers.levels}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLevel(l)}
                  className={cn(
                    "rounded-xl border px-2.5 py-1.5 text-sm font-medium",
                    levels.includes(l) ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] text-slate-600",
                  )}
                >
                  {levelLabel(l)}
                </button>
              ))}
            </div>
          </div>
          <Field label={t.common.status}>
            <select className={inputClass} value={teacherStatus} onChange={(e) => setTeacherStatus(e.target.value as TeacherStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t.teachers.status[s]}</option>)}
            </select>
          </Field>
          <Field label={t.teachers.note}>
            <textarea className={`${inputClass} h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label={t.teachers.pin}>
            <input className={inputClass} inputMode="numeric" maxLength={4} placeholder={t.teachers.pinPh} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </Field>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
        <footer className="flex gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>{t.common.save}</Button>
        </footer>
      </aside>
    </div>
  );
}
