"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { createCourse } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { sessionDates } from "@/lib/schedule";
import { localDayKey, weekdayShort } from "@/lib/utils";
import type { Level } from "@/types";

export function CourseCreateDrawer({
  teachers,
  rooms,
  branches,
  initialBranch,
  onClose,
}: {
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string; branchId: string }[];
  branches: { id: string; name: string }[];
  initialBranch: string;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState<Level>("begin");
  const [branchId, setBranchId] = useState(initialBranch);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [assistantIds, setAssistantIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:30");
  const [startDay, setStartDay] = useState(localDayKey());
  const [sessionCount, setSessionCount] = useState("8");
  const [capacity, setCapacity] = useState("12");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const count = Math.max(1, Math.min(40, Math.round(Number(sessionCount) || 8)));
  const previewDays = useMemo(
    () => (weekdays.length ? sessionDates(startDay, weekdays, count) : []),
    [startDay, weekdays, count],
  );

  function toggleDay(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function toggleAssistant(id: string) {
    setAssistantIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setSaving(true);
    setError("");
    const seats = Math.max(1, Math.round(Number(capacity) || 12));
    const code = await createCourse({
      name,
      style: style || name,
      level,
      branchId,
      teacherId,
      roomId: roomId || undefined,
      weekdays,
      start,
      end,
      description,
      capacity: seats,
      sessionCount: count,
      startDay,
      assistantIds,
    });
    setSaving(false);
    if (code) {
      setError(code === "weekday" ? t.catalog.needWeekday : code === "room" ? t.catalog.roomBranch : t.catalog.needFields);
      return;
    }
    onClose();
  }

  const branchRooms = rooms.filter((r) => r.branchId === branchId);
  const dateLabel = previewDays.map((d) => d.slice(5).replace("-", "/")).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t.common.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[34rem] flex-col bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.12)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{t.catalog.drawerTitle}</h2>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-slate-100" aria-label={t.common.close} onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.common.course}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={t.catalog.style}><input className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)} /></Field>
            <Field label={t.common.level}>
              <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                <option value="begin">Begin</option>
                <option value="inter">Inter</option>
                <option value="advance">Advance</option>
              </select>
            </Field>
            <Field label={t.common.branch}>
              <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label={t.common.teacher}>
              <select className={inputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label={`${t.common.room} (optional)`}>
              <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">—</option>
                {branchRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label={t.catalog.startDay}>
              <input type="date" className={inputClass} value={startDay} onChange={(e) => setStartDay(e.target.value)} />
            </Field>
            <Field label={t.pages.sessionCount}>
              <input type="number" min={1} max={40} className={inputClass} value={sessionCount} onChange={(e) => setSessionCount(e.target.value)} />
            </Field>
            <Field label={t.schedule.start}><input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label={t.schedule.end}><input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            <Field label={t.catalog.capacity}>
              <input type="number" min={1} inputMode="numeric" className={inputClass} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
          </div>

          <div>
            <p className="text-sm text-slate-500">{t.catalog.assistants}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {teachers.filter((x) => x.id !== teacherId).map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => toggleAssistant(x.id)}
                  className={assistantIds.includes(x.id)
                    ? "rounded-[8px] border border-[var(--brand-500)] bg-[var(--brand-50)] px-2.5 py-1.5 text-sm font-medium"
                    : "rounded-[8px] border border-[#E2E8F0] px-2.5 py-1.5 text-sm"}
                >
                  {x.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500">{t.catalog.weekdays}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={weekdays.includes(d)
                    ? "rounded-[8px] border border-[var(--brand-500)] bg-[var(--brand-50)] px-2.5 py-1.5 text-sm font-medium"
                    : "rounded-[8px] border border-[#E2E8F0] px-2.5 py-1.5 text-sm"}
                >
                  {weekdayShort(d, lang)}
                </button>
              ))}
            </div>
          </div>

          <Field label={t.catalog.description}>
            <textarea className={`${inputClass} h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {previewDays.length > 0 ? (
            <div className="rounded-[10px] border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-2.5 text-sm text-[var(--brand-700)]">
              {fill(t.catalog.previewWillCreate, { n: previewDays.length, dates: dateLabel })}
            </div>
          ) : (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              {t.catalog.needWeekday}
            </div>
          )}

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-[#E2E8F0] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" disabled={saving || previewDays.length === 0} onClick={() => void save()}>
            {t.catalog.confirmCreate}
          </Button>
        </footer>
      </aside>
    </div>
  );
}
