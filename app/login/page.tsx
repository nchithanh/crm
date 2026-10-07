"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import demo from "@/data/nhay/demo-accounts.json";
import { Button, inputClass } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <p className="text-sm font-semibold text-emerald-700">Dolphin CRM</p>
      <h1 className="mt-1 text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-2 text-sm text-slate-500">PIN demo Edu Dance. Học viên không có tài khoản.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await loginWithPin(pin);
            router.replace("/");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Không đăng nhập được");
          }
        }}
      >
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button className="w-full" type="submit">
          Vào Edu Dance
        </Button>
      </form>
      <ul className="mt-6 space-y-2 text-sm text-slate-500">
        {demo.map((a) => (
          <li key={a.pin}>
            <button type="button" className="underline" onClick={() => setPin(a.pin)}>
              {a.hint}: {a.name} · PIN {a.pin}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
