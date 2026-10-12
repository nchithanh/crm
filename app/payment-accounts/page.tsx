"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge, Button, Card, inputClass } from "@/components/ui";
import { canManagePaymentAccounts } from "@/lib/access";
import { db } from "@/lib/db";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { SEPAY_BANKS } from "@/lib/payment-accounts";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const emptyAccount: {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  accountHolder: string;
  active: boolean;
} = {
  id: "",
  name: "",
  bank: SEPAY_BANKS[0],
  accountNumber: "",
  accountHolder: "",
  active: true,
};

const emptyRule = {
  id: "",
  accountId: "",
  minAmount: "",
  maxAmount: "",
  priority: "0",
};

export default function PaymentAccountsPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canManagePaymentAccounts(role);
  const accounts = useLiveQuery(() => db.paymentAccounts.toArray(), []) ?? [];
  const routes = useLiveQuery(() => db.paymentRoutes.toArray(), []) ?? [];
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [error, setError] = useState("");

  async function saveAccount() {
    const name = accountForm.name.trim();
    const accountNumber = accountForm.accountNumber.replace(/\s/g, "");
    const accountHolder = accountForm.accountHolder.trim();
    if (!name || !accountForm.bank || !accountNumber || !accountHolder) {
      setError(t.payAccounts.needFields);
      return;
    }
    setError("");
    const id = accountForm.id || `pa-${crypto.randomUUID()}`;
    const existing = accounts.find((row) => row.id === id);
    await db.paymentAccounts.put({
      id,
      name,
      bank: accountForm.bank,
      accountNumber,
      accountHolder,
      active: accountForm.active,
      isDefault: existing?.isDefault ?? accounts.length === 0,
    });
    setAccountForm(emptyAccount);
  }

  async function setDefault(id: string) {
    await db.transaction("rw", db.paymentAccounts, async () => {
      const rows = await db.paymentAccounts.toArray();
      await Promise.all(rows.map((row) => db.paymentAccounts.update(row.id, { isDefault: row.id === id })));
    });
  }

  async function removeAccount(id: string) {
    const wasDefault = accounts.find((row) => row.id === id)?.isDefault;
    await db.transaction("rw", db.paymentAccounts, db.paymentRoutes, async () => {
      await db.paymentAccounts.delete(id);
      const linked = await db.paymentRoutes.where("accountId").equals(id).toArray();
      await Promise.all(linked.map((row) => db.paymentRoutes.delete(row.id)));
      if (wasDefault) {
        const next = (await db.paymentAccounts.filter((row) => row.active).toArray())[0];
        if (next) await db.paymentAccounts.update(next.id, { isDefault: true });
      }
    });
  }

  async function saveRule() {
    const minAmount = Number(ruleForm.minAmount);
    const maxRaw = ruleForm.maxAmount.trim();
    const maxAmount = maxRaw === "" ? null : Number(maxRaw);
    if (!ruleForm.accountId) {
      setError(t.payAccounts.needAccount);
      return;
    }
    if (!Number.isFinite(minAmount) || minAmount < 0 || (maxAmount != null && (!Number.isFinite(maxAmount) || maxAmount < minAmount))) {
      setError(t.payAccounts.badRange);
      return;
    }
    setError("");
    await db.paymentRoutes.put({
      id: ruleForm.id || `pr-${crypto.randomUUID()}`,
      accountId: ruleForm.accountId,
      minAmount,
      maxAmount,
      priority: Number(ruleForm.priority) || 0,
    });
    setRuleForm(emptyRule);
  }

  const sortedRoutes = [...routes].sort((a, b) => b.priority - a.priority || a.minAmount - b.minAmount);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="crm-page-title">{t.payAccounts.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t.payAccounts.lead}</p>
        {!canEdit ? <p className="mt-2 text-sm text-slate-500">{t.payAccounts.readOnly}</p> : null}
      </div>

      {error ? <p className="rounded-[5px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <Card className="p-4">
          <h2 className="crm-section-title">{t.payAccounts.accounts}</h2>
          {accounts.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t.payAccounts.emptyAccounts}</p> : null}
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {accounts.map((account) => (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-slate-600">{account.bank} · {account.accountNumber}</p>
                  <p className="text-sm text-slate-500">{account.accountHolder}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={account.active ? "ok" : "neutral"}>{account.active ? t.payAccounts.active : t.payAccounts.inactive}</Badge>
                  {account.isDefault ? <Badge tone="info">{t.payAccounts.default}</Badge> : null}
                  {canEdit ? (
                    <>
                      {!account.isDefault ? (
                        <Button type="button" variant="outline" className="h-9 min-h-9 px-3 text-xs" onClick={() => void setDefault(account.id)}>{t.payAccounts.setDefault}</Button>
                      ) : null}
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => setAccountForm({
                        id: account.id,
                        name: account.name,
                        bank: account.bank,
                        accountNumber: account.accountNumber,
                        accountHolder: account.accountHolder,
                        active: account.active,
                      })}>{t.payAccounts.edit}</Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => void removeAccount(account.id)}>{t.payAccounts.remove}</Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {canEdit ? (
          <Card className="p-4">
            <h2 className="crm-section-title">{accountForm.id ? t.payAccounts.accounts : t.payAccounts.addAccount}</h2>
            <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); void saveAccount(); }}>
              <label className="text-sm">{t.payAccounts.name}
                <input className={`${inputClass} mt-1`} value={accountForm.name} onChange={(e) => setAccountForm((form) => ({ ...form, name: e.target.value }))} />
              </label>
              <label className="text-sm">{t.payAccounts.bank}
                <select className={`${inputClass} mt-1`} value={accountForm.bank} onChange={(e) => setAccountForm((form) => ({ ...form, bank: e.target.value }))}>
                  {SEPAY_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </select>
              </label>
              <label className="text-sm">{t.payAccounts.number}
                <input className={`${inputClass} mt-1`} inputMode="numeric" value={accountForm.accountNumber} onChange={(e) => setAccountForm((form) => ({ ...form, accountNumber: e.target.value }))} />
              </label>
              <label className="text-sm">{t.payAccounts.holder}
                <input className={`${inputClass} mt-1`} value={accountForm.accountHolder} onChange={(e) => setAccountForm((form) => ({ ...form, accountHolder: e.target.value }))} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={accountForm.active} onChange={(e) => setAccountForm((form) => ({ ...form, active: e.target.checked }))} />
                {t.payAccounts.active}
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="h-10 min-h-10 flex-1">{t.common.save}</Button>
                {accountForm.id ? <Button type="button" variant="outline" className="h-10 min-h-10" onClick={() => setAccountForm(emptyAccount)}>{t.common.cancel}</Button> : null}
              </div>
            </form>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <Card className="p-4">
          <h2 className="crm-section-title">{t.payAccounts.rules}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.payAccounts.priorityHint}</p>
          {routes.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t.payAccounts.emptyRules}</p> : null}
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {sortedRoutes.map((route) => {
              const account = accounts.find((row) => row.id === route.accountId);
              const range = route.maxAmount == null
                ? fill(t.payAccounts.rangeOpen, { min: formatVnd(route.minAmount) })
                : fill(t.payAccounts.range, { min: formatVnd(route.minAmount), max: formatVnd(route.maxAmount) });
              return (
                <li key={route.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold tabular-nums">{range}</p>
                    <p className="text-sm text-slate-600">{account ? `${account.name} · ${account.bank}` : "—"} · {t.payAccounts.priority} {route.priority}</p>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => setRuleForm({
                        id: route.id,
                        accountId: route.accountId,
                        minAmount: String(route.minAmount),
                        maxAmount: route.maxAmount == null ? "" : String(route.maxAmount),
                        priority: String(route.priority),
                      })}>{t.payAccounts.edit}</Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => void db.paymentRoutes.delete(route.id)}>{t.payAccounts.remove}</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        {canEdit ? (
          <Card className="p-4">
            <h2 className="crm-section-title">{t.payAccounts.addRule}</h2>
            <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); void saveRule(); }}>
              <label className="text-sm">{t.payAccounts.account}
                <select className={`${inputClass} mt-1`} value={ruleForm.accountId} onChange={(e) => setRuleForm((form) => ({ ...form, accountId: e.target.value }))}>
                  <option value="">{t.common.choose}</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="text-sm">{t.payAccounts.min}
                <input className={`${inputClass} mt-1`} inputMode="numeric" value={ruleForm.minAmount} onChange={(e) => setRuleForm((form) => ({ ...form, minAmount: e.target.value }))} />
              </label>
              <label className="text-sm">{t.payAccounts.max}
                <input className={`${inputClass} mt-1`} inputMode="numeric" placeholder={t.payAccounts.maxHint} value={ruleForm.maxAmount} onChange={(e) => setRuleForm((form) => ({ ...form, maxAmount: e.target.value }))} />
              </label>
              <label className="text-sm">{t.payAccounts.priority}
                <input className={`${inputClass} mt-1`} inputMode="numeric" value={ruleForm.priority} onChange={(e) => setRuleForm((form) => ({ ...form, priority: e.target.value }))} />
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="h-10 min-h-10 flex-1">{t.common.save}</Button>
                {ruleForm.id ? <Button type="button" variant="outline" className="h-10 min-h-10" onClick={() => setRuleForm(emptyRule)}>{t.common.cancel}</Button> : null}
              </div>
            </form>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
