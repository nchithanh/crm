import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** CTA — PeopleHub: 14px radius, violet primary. design-language.md */
export const ctaPrimary =
  "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-600)] active:opacity-90";
export const ctaOutline =
  "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--brand-300)] bg-white px-4 text-sm font-semibold text-[var(--brand-600)] hover:bg-[var(--brand-50)] active:opacity-90";
export const ctaGhost =
  "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-50)] active:opacity-90";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <button
      className={cn(
        "disabled:opacity-50",
        variant === "primary" && ctaPrimary,
        variant === "outline" && ctaOutline,
        variant === "ghost" && ctaGhost,
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[18px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "neutral" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "ok" && "bg-green-50 text-green-700",
        tone === "warn" && "bg-amber-50 text-amber-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-[var(--brand-50)] text-[var(--brand-600)]",
        tone === "neutral" && "bg-[#F5F6FA] text-[var(--muted)]",
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="crm-body block min-w-0">
      <span className="crm-lead">{label}</span>
      <div className="mt-1 min-w-0">{children}</div>
    </label>
  );
}

export const inputClass =
  "h-11 w-full min-w-0 rounded-[12px] border border-[var(--border)] bg-white px-3 text-base font-normal text-[var(--foreground)] outline-none focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]";

/** Toolbar / filter selects — không `w-full` (tránh full-bleed trên desktop). */
export const inputClassInline =
  "h-11 w-auto min-w-[9rem] shrink-0 rounded-[12px] border border-[var(--border)] bg-white px-3 text-base font-normal text-[var(--foreground)] outline-none focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]";
