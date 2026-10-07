"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { reopenDb } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { getStoredVertical, type VerticalId } from "@/lib/vertical";
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
    setVertical(getStoredVertical());
  }, [path, hydrated]);

  useEffect(() => {
    if (!hydrated || vertical === undefined) return;
    if (!vertical) {
      setReady(false);
      if (path !== "/chon-linh-vuc") router.replace("/chon-linh-vuc");
      return;
    }
    if (!user && path !== "/login" && path !== "/chon-linh-vuc") {
      router.replace("/login");
      return;
    }
    if (user && (path === "/login" || path === "/chon-linh-vuc")) {
      router.replace("/");
    }
  }, [hydrated, user, path, router, vertical]);

  useEffect(() => {
    if (!vertical || path === "/chon-linh-vuc") {
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
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return children;
  return <AppShell>{children}</AppShell>;
}
