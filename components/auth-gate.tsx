"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { BootSplash } from "@/components/boot-splash";
import { I18nProvider } from "@/lib/i18n";
import { bootStudio, resetBoot } from "@/lib/seed";
import { applyVerticalTheme, getStoredVertical, type VerticalId } from "@/lib/vertical";
import { homePathForRole } from "@/lib/access";
import { useAccessStore } from "@/stores/access-store";
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
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    const stop = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    const timer = window.setTimeout(() => setHydrated(true), 3000);
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [setHydrated]);

  useEffect(() => {
    const stored = getStoredVertical();
    setVertical(stored);
    if (stored) applyVerticalTheme(stored);
  }, [path, hydrated]);

  useEffect(() => {
    if (!hydrated || vertical === undefined) return;
    if (!vertical) {
      if (path !== "/choose-vertical") router.replace("/choose-vertical");
      return;
    }
    if (!user && path !== "/login" && path !== "/choose-vertical") {
      router.replace("/login");
      return;
    }
    if (user && (path === "/login" || path === "/choose-vertical")) {
      router.replace(homePathForRole(user.role));
    }
  }, [hydrated, user, path, router, vertical]);

  useEffect(() => {
    if (!hydrated || vertical === undefined) return;
    if (!vertical) {
      setReady(true);
      setSlow(false);
      return;
    }
    let cancelled = false;
    if (!user) setReady(true);
    else setReady(false);
    setSlow(false);
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, 3000);
    const cap = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 5000);
    void bootStudio(vertical)
      .then(() => useAccessStore.getState().hydrate())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(cap);
    };
  }, [hydrated, vertical, user, attempt]);

  if (!hydrated || vertical === undefined || !ready) {
    return (
      <I18nProvider>
        <BootSplash
          slow={slow}
          onRetry={() => {
            resetBoot();
            setSlow(false);
            setReady(false);
            setAttempt((n) => n + 1);
          }}
          onLogin={() => {
            setReady(true);
            router.replace(vertical ? "/login" : "/choose-vertical");
          }}
        />
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
