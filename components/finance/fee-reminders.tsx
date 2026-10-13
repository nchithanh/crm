"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { canSeeMoney } from "@/lib/access";
import { fill } from "@/lib/copy";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { debtRemaining } from "@/lib/metrics";
import { pickPaymentAccount, sepayQrUrl, transferMemo } from "@/lib/payment-accounts";
import { shareTransferNotice } from "@/lib/share-transfer";
import { formatVnd } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStudioBranch } from "@/stores/branch-store";
import { transferQrPayload } from "@/components/finance/transfer-qr";

export function FeeRemindButton() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const showMoney = canSeeMoney(role);
  const { branchId } = useStudioBranch();
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const receivables = useLiveQuery(() => db.installments.toArray(), []) ?? [];
  const accounts = useLiveQuery(() => db.paymentAccounts.toArray(), []) ?? [];
  const routes = useLiveQuery(() => db.paymentRoutes.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Record<string, "shared" | "copied">>({});

  const groups = useMemo(() => {
    const inBranch = (id: string) => branchId === "all" || id === branchId;
    const byStudent = new Map<string, number>();
    for (const row of receivables) {
      if (!inBranch(row.branchId)) continue;
      const left = debtRemaining(row);
      if (left <= 0) continue;
      byStudent.set(row.studentId, (byStudent.get(row.studentId) ?? 0) + left);
    }
    const studio = settings?.name || t.brand;
    const buckets = new Map<string, {
      id: string;
      title: string;
      preview: string;
      people: { id: string; name: string; phone: string; amount: number; text: string; imageUrl?: string }[];
    }>();
    for (const [studentId, amount] of byStudent) {
      const student = students.find((row) => row.id === studentId);
      if (!student) continue;
      const account = pickPaymentAccount(amount, accounts, routes);
      const memo = transferMemo(student.name);
      const imageUrl = account ? sepayQrUrl(account, amount, memo) : undefined;
      const accountLine = account
        ? fill(t.money.qrAccount, { bank: account.bank, number: account.accountNumber, holder: account.accountHolder })
        : "";
      const text = [
        studio,
        `${t.common.student}: ${student.name}`,
        `${t.money.transferTitle} ${formatVnd(amount)}`,
        accountLine || null,
        memo,
        imageUrl || transferQrPayload(amount, student.name),
        account ? t.money.qrSepayNote : t.money.qrDemoNote,
      ].filter(Boolean).join("\n");
      const key = account?.id ?? "demo";
      const bucket = buckets.get(key) ?? {
        id: key,
        title: account ? `${account.name} · ${accountLine}` : t.money.qrDemoNote,
        preview: "",
        people: [],
      };
      bucket.people.push({ id: student.id, name: student.name, phone: student.phone, amount, text, imageUrl });
      if (!bucket.preview) bucket.preview = text;
      buckets.set(key, bucket);
    }
    return [...buckets.values()]
      .map((group) => ({ ...group, people: group.people.sort((a, b) => a.name.localeCompare(b.name, "vi")) }))
      .sort((a, b) => b.people.length - a.people.length);
  }, [accounts, branchId, receivables, routes, settings?.name, students, t]);

  const count = groups.reduce((sum, group) => sum + group.people.length, 0);
  if (!showMoney || count === 0) return null;

  async function share(personId: string, title: string, text: string, imageUrl: string | undefined, phone: string) {
    const result = await shareTransferNotice({ title, text, imageUrl, phone });
    if (result === "aborted") return;
    setStatus((current) => ({ ...current, [personId]: result }));
  }

  return (
    <>
      <button
        type="button"
        className="mt-3 inline-flex h-8 items-center rounded-[5px] bg-[var(--brand-500)] px-2.5 text-xs font-semibold text-white"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {t.dash.remindZalo} · {count}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={(event) => event.stopPropagation()}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[5px] bg-white p-5 text-left" role="dialog" aria-modal="true" aria-labelledby="fee-remind-title">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="fee-remind-title" className="text-lg font-bold text-[var(--foreground)]">{t.dash.remindTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{fill(t.dash.remindLead, { n: count })}</p>
              </div>
              <button type="button" className="rounded-[5px] p-1 text-slate-500 hover:bg-slate-100" aria-label={t.common.close} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
              {groups.map((group) => (
                <section key={group.id} className="rounded-[5px] border border-[var(--border)] p-3">
                  <p className="font-semibold text-[var(--foreground)]">{group.title}</p>
                  <p className="mt-1 text-sm tabular-nums text-slate-500">{fill(t.dash.remindCount, { n: group.people.length })}</p>
                  <pre className="mt-2 overflow-x-hidden rounded-[5px] bg-[var(--search)] p-3 text-xs break-all whitespace-pre-wrap text-[var(--foreground)]">{group.preview}</pre>
                  <ul className="mt-3 divide-y divide-[var(--border)]">
                    {group.people.map((person) => (
                      <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-sm tabular-nums text-slate-500">{formatVnd(person.amount)}{person.phone ? ` · ${person.phone}` : ` · ${t.dash.remindNoPhone}`}</p>
                          {status[person.id] ? (
                            <p className="text-xs text-slate-500">{status[person.id] === "shared" ? t.dash.remindShared : t.dash.remindCopied}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 min-h-9 px-3 text-xs"
                          onClick={() => void share(person.id, t.money.transferTitle, person.text, person.imageUrl, person.phone)}
                        >
                          {t.money.share}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
