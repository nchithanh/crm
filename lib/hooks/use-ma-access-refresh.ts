"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isMaStudioMode } from "@/lib/access";
import { useAuthStore } from "@/stores/auth-store";

function pathOf(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function shouldRefreshOnPath(path: string) {
  return (
    path === "/tasks" ||
    path.startsWith("/tasks/") ||
    path === "/settings/access" ||
    path.startsWith("/settings/access/") ||
    path === "/staff" ||
    path.startsWith("/staff/")
  );
}

const MIN_INTERVAL_MS = 8000;

/**
 * MA: sync session (role/status từ GET /me) + ma trận quyền.
 * Chạy khi focus/visibility hoặc vào Tác vụ / Phân quyền / Staff — có throttle tránh loop.
 */
export function useMaAccessRefresh() {
  const path = pathOf(usePathname());
  const syncMaSession = useAuthStore((s) => s.syncMaSession);
  const busy = useRef(false);
  const lastAt = useRef(0);

  useEffect(() => {
    if (!isMaStudioMode()) return;

    async function run(force = false) {
      const now = Date.now();
      if (!force && now - lastAt.current < MIN_INTERVAL_MS) return;
      if (busy.current) return;
      busy.current = true;
      lastAt.current = now;
      try {
        await syncMaSession();
      } finally {
        busy.current = false;
      }
    }

    function onFocus() {
      void run(false);
    }
    function onVis() {
      if (document.visibilityState === "visible") void run(false);
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [syncMaSession]);

  useEffect(() => {
    if (!isMaStudioMode()) return;
    if (!shouldRefreshOnPath(path)) return;
    // Đổi route quan trọng → sync (vẫn tôn trọng busy; bỏ throttle ngắn khi đổi trang)
    const now = Date.now();
    if (now - lastAt.current < 1500) return;
    lastAt.current = now;
    void syncMaSession();
  }, [path, syncMaSession]);
}
