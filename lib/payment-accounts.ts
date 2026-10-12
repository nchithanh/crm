import type { PaymentAccount, PaymentRoute } from "@/types";

/** Mã `bank` SePay dùng trên qr.sepay.vn. */
export const SEPAY_BANKS = [
  "MBBank",
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Agribank",
  "ACB",
  "Techcombank",
  "VPBank",
  "TPBank",
  "Sacombank",
  "HDBank",
  "OCB",
  "MSB",
  "VIB",
  "SHB",
  "Eximbank",
] as const;

export function transferMemo(studentName: string) {
  const name = studentName.replace(/\s+/g, " ").trim().slice(0, 40);
  return name ? `HP ${name}` : "HP";
}

export function sepayQrUrl(account: Pick<PaymentAccount, "bank" | "accountNumber">, amount: number, memo: string) {
  const params = new URLSearchParams({
    acc: account.accountNumber.replace(/\s/g, ""),
    bank: account.bank,
    amount: String(Math.max(0, Math.round(amount))),
    des: memo,
    template: "compact",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

/** Luật khớp số tiền, priority cao hơn thắng. Không khớp thì tài khoản mặc định đang bật. */
export function pickPaymentAccount(amount: number, accounts: PaymentAccount[], routes: PaymentRoute[]) {
  const active = new Map(accounts.filter((account) => account.active).map((account) => [account.id, account]));
  const hits = routes
    .filter((route) => {
      const account = active.get(route.accountId);
      if (!account) return false;
      if (amount < route.minAmount) return false;
      if (route.maxAmount != null && amount > route.maxAmount) return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority || b.minAmount - a.minAmount);
  if (hits[0]) return active.get(hits[0].accountId) ?? null;
  return accounts.find((account) => account.active && account.isDefault) ?? null;
}
