"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbsForPath } from "@/lib/breadcrumbs";
import { useI18n } from "@/lib/i18n";

export function AppBreadcrumb() {
  const path = usePathname().replace(/\/$/, "") || "/";
  const { lang } = useI18n();
  const crumbs = breadcrumbsForPath(path, lang);
  if (crumbs.length === 0) return null;

  return (
    <nav className="mb-3 text-sm text-slate-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-slate-300" aria-hidden>/</span> : null}
            {c.href ? (
              <Link href={c.href} className="font-medium text-[var(--brand-600)] hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
