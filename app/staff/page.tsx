"use client";

import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Badge, Button, Card, Field, Spinner, inputClass } from "@/components/ui";
import { isMaStudioMode } from "@/lib/access";
import {
  apiCreateStaff,
  apiDeactivateStaff,
  apiUpdateStaff,
  apiUpdateStaffPassword,
  fetchMaStaffAll,
  MA_CREATABLE_ROLES,
  shareStaffCredentials,
  staffShareText,
  type MaStaff,
} from "@/lib/api/crm-staff";
import { fetchMaBranches, type MaBranch } from "@/lib/api/crm-tasks";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types";

type Draft = {
  name: string;
  username: string;
  password: string;
  role: Role;
  branchId: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  username: "",
  password: "",
  role: "reception",
  branchId: "",
});

/** Cú pháp ma@ + 4 số cuối random, vd. ma@4821 */
function genMaPassword() {
  const n = Math.floor(Math.random() * 10000);
  return `ma@${String(n).padStart(4, "0")}`;
}

export default function StaffPage() {
  const { lang, t } = useI18n();
  const me = useAuthStore((s) => s.user);
  const maMode = isMaStudioMode();
  const canManage = maMode && me?.role === "boss";

  const [staff, setStaff] = useState<MaStaff[]>([]);
  const [branches, setBranches] = useState<MaBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordId, setPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  /** Plain passwords giữ tạm để Share sau create / đổi MK. */
  const [plainPass, setPlainPass] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!maMode) return;
    setLoading(true);
    try {
      const [s, b] = await Promise.all([fetchMaStaffAll(), fetchMaBranches()]);
      setStaff(s);
      setBranches(b);
    } catch {
      setStaff([]);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [maMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function branchLabel(branchId: string) {
    if (!branchId) return t.staffPage.allBranches;
    return branches.find((b) => b.id === branchId)?.name ?? branchId;
  }

  async function doShare(row: MaStaff, password: string) {
    const text = staffShareText({
      studio: "Ma Dance Studio",
      name: row.name,
      username: row.username,
      password,
      roleLabel: roleLabel(row.role, lang),
    });
    const result = await shareStaffCredentials(text, t.staffPage.shareTitle);
    if (result === "copied") setOk(t.staffPage.shareCopied);
    else if (result === "fail") setError(t.staffPage.shareFail);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError("");
    setOk("");
    const u = draft.username.trim();
    if (!u || draft.password.trim().length < 6) {
      setError(t.staffPage.needFields);
      return;
    }
    setSaving(true);
    try {
      const plain = draft.password.trim();
      const created = await apiCreateStaff({
        username: u,
        password: plain,
        name: draft.name.trim() || u,
        role: draft.role,
        branchId: draft.branchId,
      });
      setPlainPass((prev) => ({ ...prev, [created.id]: plain }));
      setOk(fill(t.staffPage.created, { user: created.username }));
      setDraft(emptyDraft);
      await reload();
      await doShare(created, plain);
    } catch {
      setError(t.staffPage.fail);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !editingId) return;
    setError("");
    setOk("");
    setSaving(true);
    try {
      await apiUpdateStaff({
        id: editingId,
        name: draft.name.trim() || draft.username,
        role: draft.role,
        branchId: draft.branchId,
      });
      setOk(t.staffPage.updated);
      setEditingId(null);
      setDraft(emptyDraft);
      await reload();
    } catch {
      setError(t.staffPage.fail);
    } finally {
      setSaving(false);
    }
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !passwordId) return;
    setError("");
    setOk("");
    if (newPassword.trim().length < 6) {
      setError(t.staffPage.needPassword);
      return;
    }
    setSaving(true);
    try {
      const plain = newPassword.trim();
      const row = await apiUpdateStaffPassword(passwordId, plain);
      setPlainPass((prev) => ({ ...prev, [row.id]: plain }));
      setOk(t.staffPage.passwordSet);
      setPasswordId(null);
      setNewPassword("");
      await reload();
      await doShare(row, plain);
    } catch {
      setError(t.staffPage.fail);
    } finally {
      setSaving(false);
    }
  }

  async function onToggleLock(row: MaStaff) {
    if (!canManage || row.role === "boss" || row.id === me?.id) return;
    setError("");
    setOk("");
    if (row.status === "active" && !window.confirm(t.staffPage.confirmLock)) return;
    setSaving(true);
    try {
      if (row.status === "active") {
        await apiDeactivateStaff(row.id);
        setOk(t.staffPage.deactivated);
      } else {
        await apiUpdateStaff({ id: row.id, status: "active" });
        setOk(t.staffPage.reactivated);
      }
      await reload();
    } catch {
      setError(t.staffPage.fail);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: MaStaff) {
    setPasswordId(null);
    setEditingId(row.id);
    setDraft({
      name: row.name,
      username: row.username,
      password: "",
      role: row.role === "boss" ? "owner" : row.role,
      branchId: row.branchId,
    });
    setError("");
    setOk("");
  }

  function startPassword(row: MaStaff) {
    setEditingId(null);
    setPasswordId(row.id);
    setNewPassword("");
    setError("");
    setOk("");
  }

  if (!maMode || !canManage) {
    return (
      <div>
        <h1 className="crm-page-title">{t.staffPage.title}</h1>
        <p className="mt-2 text-sm text-rose-600">{t.staffPage.onlyBoss}</p>
      </div>
    );
  }

  const editingBoss = editingId ? staff.find((s) => s.id === editingId)?.role === "boss" : false;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="crm-page-title">{t.staffPage.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.staffPage.subtitle}</p>
      </div>

      {!editingId && !passwordId ? (
        <Card className="p-4 sm:p-5">
          <form className="space-y-3" onSubmit={onCreate}>
            <Field label={t.staffPage.name}>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                autoComplete="off"
              />
            </Field>
            <Field label={t.staffPage.username}>
              <input
                className={inputClass}
                value={draft.username}
                onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                autoComplete="off"
                required
              />
            </Field>
            <Field label={t.staffPage.password}>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  type="text"
                  value={draft.password}
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => setDraft((d) => ({ ...d, password: genMaPassword() }))}
                >
                  {t.staffPage.genPassword}
                </Button>
              </div>
            </Field>
            <Field label={t.staffPage.role}>
              <select
                className={inputClass}
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as Role }))}
              >
                {MA_CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.staffPage.branch}>
              <select
                className={inputClass}
                value={draft.branchId}
                onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))}
              >
                <option value="">{t.staffPage.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
            <Button type="submit" busy={saving}>
              {saving ? t.common.saving : t.staffPage.submit}
            </Button>
          </form>
        </Card>
      ) : null}

      {editingId ? (
        <Card className="p-4 sm:p-5">
          <form className="space-y-3" onSubmit={onSaveEdit}>
            <Field label={t.staffPage.username}>
              <input className={inputClass} value={draft.username} disabled readOnly />
            </Field>
            <Field label={t.staffPage.name}>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>
            {!editingBoss ? (
              <Field label={t.staffPage.role}>
                <select
                  className={inputClass}
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as Role }))}
                >
                  {MA_CREATABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r, lang)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={t.staffPage.branch}>
              <select
                className={inputClass}
                value={draft.branchId}
                onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))}
              >
                <option value="">{t.staffPage.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" busy={saving}>
                {saving ? t.common.saving : t.staffPage.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
              >
                {t.staffPage.cancel}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {passwordId ? (
        <Card className="p-4 sm:p-5">
          <form className="space-y-3" onSubmit={onSavePassword}>
            <Field label={t.staffPage.newPassword}>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => setNewPassword(genMaPassword())}
                >
                  {t.staffPage.genPassword}
                </Button>
              </div>
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" busy={saving}>
                {saving ? t.common.saving : t.staffPage.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setPasswordId(null);
                  setNewPassword("");
                }}
              >
                {t.staffPage.cancel}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <section className="crm-card-elev p-4 sm:p-5" aria-labelledby="staff-list-h">
        <h2 id="staff-list-h" className="crm-section-title">
          {t.staffPage.listTitle}
        </h2>
        {loading ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Spinner className="text-[var(--brand-500)]" /> {t.common.loading}
          </p>
        ) : staff.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.staffPage.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {staff.map((u) => {
              const isSelf = u.id === me?.id;
              const isBoss = u.role === "boss";
              const canMutate = !isBoss && !isSelf;
              const plain = plainPass[u.id];
              return (
                <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: u.avatarColor }}
                      aria-hidden
                    >
                      {u.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {u.username} · {branchLabel(u.branchId)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={isBoss ? "info" : "neutral"}>{roleLabel(u.role, lang)}</Badge>
                        <Badge tone={u.status === "active" ? "ok" : "danger"}>
                          {u.status === "active" ? t.staffPage.statusActive : t.staffPage.statusInactive}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plain ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 min-h-9 px-3 text-xs"
                        onClick={() => void doShare(u, plain)}
                      >
                        <Share2 size={14} /> {t.staffPage.share}
                      </Button>
                    ) : null}
                    {!isBoss ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 min-h-9 px-3 text-xs"
                        onClick={() => startEdit(u)}
                      >
                        {t.staffPage.edit}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 min-h-9 px-3 text-xs"
                        onClick={() => startEdit(u)}
                      >
                        {t.staffPage.edit}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 min-h-9 px-3 text-xs"
                      onClick={() => startPassword(u)}
                    >
                      {t.staffPage.changePassword}
                    </Button>
                    {canMutate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 min-h-9 px-3 text-xs"
                        busy={saving}
                        onClick={() => void onToggleLock(u)}
                      >
                        {u.status === "active" ? t.staffPage.lock : t.staffPage.unlock}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
