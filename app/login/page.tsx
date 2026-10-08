"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import anhDemo from "@/data/anh/demo-accounts.json";
import boiDemo from "@/data/boi/demo-accounts.json";
import nhacDemo from "@/data/nhac/demo-accounts.json";
import nhayDemo from "@/data/nhay/demo-accounts.json";
import { BrandMark } from "@/components/brand-mark";
import { Button, inputClass } from "@/components/ui";
import { fill } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { roleLabel } from "@/lib/labels";
import { getStoredVertical, VERTICALS, type VerticalId } from "@/lib/vertical";
import { useAuthStore } from "@/stores/auth-store";

const demos: Record<VerticalId, typeof nhayDemo> = {
  nhay: nhayDemo,
  anh: anhDemo,
  nhac: nhacDemo,
  boi: boiDemo,
};

export default function LoginPage() {
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { lang, t } = useI18n();
  const [vertical, setVertical] = useState<VerticalId>("nhay");
  useEffect(() => {
    const stored = getStoredVertical();
    if (stored) setVertical(stored);
  }, []);
  const option = VERTICALS.find((v) => v.id === vertical) ?? VERTICALS[0];
  const demo = demos[option.id];

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <BrandMark className="h-14 w-14" />
      <p className="mt-3 text-sm font-semibold text-[var(--brand-500)]">{t.brand}</p>
      <h1 className="mt-1 text-2xl font-bold">{t.login.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{fill(t.login.hint, { name: option.label })}</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await loginWithPin(pin);
            router.replace("/");
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            setError(message === "bad-pin" ? t.login.badPin : t.login.fail);
          }
        }}
      >
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder={t.login.pin}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button className="w-full" type="submit">
          {fill(t.login.enter, { name: option.label })}
        </Button>
      </form>
      <ul className="mt-6 space-y-2 text-sm text-slate-500">
        {demo.map((a) => (
          <li key={a.pin}>
            <button type="button" className="underline" onClick={() => setPin(a.pin)}>
              {roleLabel(a.role, lang)}: {a.name} · PIN {a.pin}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-6 text-left text-sm font-semibold text-[var(--brand-500)]"
        onClick={() => router.push("/chon-linh-vuc")}
      >
        {t.login.switch}
      </button>
    </main>
  );
}
