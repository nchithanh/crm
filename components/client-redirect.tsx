"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ClientRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return <p className="text-sm text-slate-500">Đang chuyển…</p>;
}
