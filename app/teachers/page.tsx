"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { TeacherDrawer } from "@/components/teacher-drawer";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { canManageCatalog } from "@/lib/access";
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
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const { branchId } = useStudioBranch();
  const [q, setQ] = useState("");
  const [style, setStyle] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openId, setOpenId] = useState<string | null>(null);
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
    }));
  }, [teachers, q, status, style, branchId, sortKey, sortDir, branches, classes, sessions, week.from, week.to]);

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
        <div className="mt-6 flex flex-col items-center rounded-[12px] border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center">
          <p className="text-sm text-slate-500">{t.teachers.empty}</p>
          {canEdit ? (
            <Button type="button" className="mt-4" onClick={openCreate}>{t.teachers.add}</Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 max-h-[min(70dvh,760px)] overflow-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-slate-50 text-left">
              <tr>
                {([
                  ["name", t.teachers.title],
                  ["branch", t.common.branch],
                  ["classes", t.teachers.classes],
                  ["week", t.teachers.perWeek],
                  ["status", t.common.status],
                ] as const).map(([key, label]) => (
                  <th key={key} className="px-3 py-3">
                    <button type="button" className="font-semibold text-slate-600" onClick={() => toggleSort(key)}>
                      {label}{sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-slate-600">{t.teachers.skills}</th>
                <th className="w-36 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ teacher, classCount, weekCount }) => {
                const st = teacher.teacherStatus ?? "active";
                return (
                  <tr
                    key={teacher.id}
                    className="group cursor-pointer border-t border-slate-100 hover:bg-[var(--brand-50)]"
                    onClick={() => setOpenId(teacher.id)}
                  >
                    <td className="px-3 py-3">
                      <Link href={`/teachers/${teacher.id}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: teacher.avatarColor }}>
                          {initials(teacher.name)}
                        </span>
                        <span>
                          <span className="block font-semibold text-[var(--brand-600)] hover:underline">{teacher.name}</span>
                          <span className="text-xs text-slate-400">{teacher.phone}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{branches.find((b) => b.id === teacher.branchId)?.name ?? "—"}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-700">{classCount}</td>
                    <td className={cn("px-3 py-3 tabular-nums", weekCount > 10 ? "font-semibold text-rose-600" : "text-slate-700")}>{weekCount}</td>
                    <td className="px-3 py-3"><Badge tone={statusTone(st)}>{t.teachers.status[st]}</Badge></td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1">
                        {(teacher.styles ?? []).slice(0, 3).map((s) => <Badge key={s} tone="info">{s}</Badge>)}
                        {(teacher.levels ?? []).map((l) => <Badge key={l}>{levelLabel(l)}</Badge>)}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                        {canEdit ? (
                          <button type="button" className="text-xs font-semibold text-[var(--brand-600)]" onClick={() => openEdit(teacher.id)}>
                            {t.catalog.edit}
                          </button>
                        ) : null}
                        <Link href="/schedule" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                          {t.teachers.viewSchedule}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      <aside className="relative flex h-full w-full max-w-[34rem] flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{teacher ? t.teachers.edit : t.teachers.add}</h2>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.common.close} onClick={onClose}>
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
                    "rounded-[8px] border px-2.5 py-1.5 text-sm font-medium",
                    styles.includes(s) ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[#E2E8F0] text-slate-600",
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
                    "rounded-[8px] border px-2.5 py-1.5 text-sm font-medium",
                    levels.includes(l) ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[#E2E8F0] text-slate-600",
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
        <footer className="flex gap-2 border-t border-[#E2E8F0] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>{t.common.save}</Button>
        </footer>
      </aside>
    </div>
  );
}
