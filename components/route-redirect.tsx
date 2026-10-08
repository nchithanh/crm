"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Client redirect for static export (GitHub Pages). */
export function RouteRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <p className="p-6 text-sm text-slate-500">…</p>;
}
