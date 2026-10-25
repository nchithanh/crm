"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { filterColorOf } from "@/components/filter-checklist";
import { CrmDrawerShell, useOverlayClose } from "@/components/crm-overlay";
import { Button, Field, inputClass } from "@/components/ui";
import { createTaskParent, deleteTaskParent, updateTaskParent } from "@/lib/actions";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StudioTask, TaskParent } from "@/types";

export function ParentChip({ id, name, className }: { id: string; name: string; className?: string }) {
  const color = filterColorOf(id);
  return (
    <span
      className={cn("inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-xs font-semibold", className)}
      style={{ borderColor: color, color, background: `${color}1a` }}
    >
      {name}
    </span>
  );
}

export function TaskParentDrawer({
  parents,
  tasks,
  canEdit,
  onClose,
  onChanged,
}: {
  parents: TaskParent[];
  tasks: StudioTask[];
  canEdit: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const { leaving, requestClose } = useOverlayClose(onClose);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return parents.map((parent) => {
      const list = tasks.filter((task) => task.parentId === parent.id);
      const done = list.filter((task) => task.status === "done").length;
      const open = list.filter((task) => task.status !== "done");
      const pool = open.length ? open : list;
      const earliest = pool.map((task) => task.dueDay).sort()[0] ?? "";
      return { ...parent, total: list.length, done, earliest };
    });
  }, [parents, tasks]);

  async function onCreate() {
    if (!canEdit || creating) return;
    setCreating(true);
    setError("");
    try {
      const result = await createTaskParent(name);
      if ("error" in result) {
        setError(t.task.needParentName);
        return;
      }
      setName("");
      onChanged?.();
    } finally {
      setCreating(false);
    }
  }

  async function onSaveName(id: string) {
    if (!canEdit || busyId) return;
    setBusyId(id);
    setError("");
    try {
      const result = await updateTaskParent(id, editName);
      if ("error" in result) {
        setError(t.task.needParentName);
        return;
      }
      setEditingId(null);
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (!canEdit || busyId) return;
    setBusyId(id);
    setError("");
    try {
      const result = await deleteTaskParent(id);
      if ("error" in result) {
        setError(t.task.parentDeleteFail);
        return;
      }
      setConfirmId(null);
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <CrmDrawerShell leaving={leaving} onClose={requestClose} closeLabel={t.common.close} panelClassName="max-w-md overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <h2 className="crm-section-title text-lg">{t.task.parentManageTitle}</h2>
        <button type="button" onClick={requestClose} aria-label={t.common.close} className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--brand-50)] hover:text-[var(--foreground)]">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {canEdit ? (
          <section className="crm-card-elev p-4">
            <Field label={t.task.parentName}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
            <Button type="button" className="mt-3 w-full" busy={creating} onClick={() => void onCreate()}>
              {creating ? t.common.saving : t.task.createParent}
            </Button>
          </section>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t.task.parentEmpty}</p>
        ) : (
          rows.map((row) => {
            const pct = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100);
            const color = filterColorOf(row.id);
            return (
              <article key={row.id} className="crm-card-elev p-4">
                <div className="flex items-start justify-between gap-2">
                  <ParentChip id={row.id} name={row.name} />
                  <p className="shrink-0 text-xs tabular-nums text-slate-500">{fill(t.task.progressCount, { done: row.done, total: row.total })}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t.task.progress} · {pct}%
                  {row.earliest ? ` · ${fill(t.task.earliestDue, { day: row.earliest })}` : ""}
                </p>
                {canEdit ? (
                  editingId === row.id ? (
                    <div className="mt-3 grid gap-2">
                      <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" disabled={busyId === row.id} onClick={() => setEditingId(null)}>{t.common.cancel}</Button>
                        <Button type="button" busy={busyId === row.id} onClick={() => void onSaveName(row.id)}>{t.common.save}</Button>
                      </div>
                    </div>
                  ) : confirmId === row.id ? (
                    <div className="mt-3 grid gap-2">
                      <p className="text-sm text-slate-600">{t.task.parentDeleteHint}</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" disabled={busyId === row.id} onClick={() => setConfirmId(null)}>{t.common.cancel}</Button>
                        <Button type="button" busy={busyId === row.id} onClick={() => void onDelete(row.id)}>{t.task.parentDelete}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 min-h-9 flex-1 text-xs"
                        onClick={() => { setEditingId(row.id); setEditName(row.name); setConfirmId(null); }}
                      >
                        {t.task.parentRename}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 min-h-9 flex-1 text-xs"
                        onClick={() => { setConfirmId(row.id); setEditingId(null); }}
                      >
                        {t.task.parentDelete}
                      </Button>
                    </div>
                  )
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </CrmDrawerShell>
  );
}
