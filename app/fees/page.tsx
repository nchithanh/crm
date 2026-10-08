"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FeesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/finance/collect${qs}`);
  }, [router]);
  return <p className="p-6 text-sm text-slate-500">…</p>;
}
