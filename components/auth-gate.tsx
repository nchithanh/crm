"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { BootSplash } from "@/components/boot-splash";
import { I18nProvider } from "@/lib/i18n";
import { reopenDb } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { applyVerticalTheme, getStoredVertical, type VerticalId } from "@/lib/vertical";
import { useAuthStore } from "@/stores/auth-store";

function pathOf(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = pathOf(usePathname());
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const [vertical, setVertical] = useState<VerticalId | null | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [setHydrated]);

  useEffect(() => {
    const stored = getStoredVertical();
    setVertical(stored);
    if (stored) applyVerticalTheme(stored);
  }, [path, hydrated]);

  useEffect(() => {
    if (!hydrated || vertical === undefined) return;
    if (!vertical) {
      setReady(false);
      if (path !== "/choose-vertical") router.replace("/choose-vertical");
      return;
    }
    if (!user && path !== "/login" && path !== "/choose-vertical") {
      router.replace("/login");
      return;
    }
    if (user && (path === "/login" || path === "/choose-vertical")) {
      router.replace("/overview");
    }
  }, [hydrated, user, path, router, vertical]);

  useEffect(() => {
    if (!vertical || path === "/choose-vertical") {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    reopenDb(vertical);
    void ensureSeed(vertical).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [vertical, path]);

  if (!hydrated || vertical === undefined || !ready) {
    return (
      <I18nProvider>
        <BootSplash />
      </I18nProvider>
    );
  }

  if (!user) return <I18nProvider>{children}</I18nProvider>;
  return (
    <I18nProvider>
      <AppShell>{children}</AppShell>
    </I18nProvider>
  );
}
