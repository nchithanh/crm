"use client";

import { useEffect } from "react";

const STORAGE_KEY = "crm-fe-build-id";

type BuildIdPayload = { buildId?: string };

/**
 * GitHub Pages không set Cache-Control cho HTML; app ghim (standalone) hay giữ bundle cũ.
 * Mỗi lần mở / focus lại: fetch build-id.json (no-store) → khác localStorage thì reload cứng.
 */
export function BuildUpdateGuard() {
  useEffect(() => {
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
    const url = `${basePath}/build-id.json`;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as BuildIdPayload;
        const next = typeof data.buildId === "string" ? data.buildId.trim() : "";
        if (!next) return;

        const prev = localStorage.getItem(STORAGE_KEY);
        if (prev === next) return;

        localStorage.setItem(STORAGE_KEY, next);
        // Lần đầu ghi id — không reload. Lần sau khác id → reload để lấy HTML/JS mới.
        if (prev !== null) {
          window.location.reload();
        }
      } catch {
        // Offline / 404 khi chưa build — bỏ qua
      }
    }

    void check();

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
