import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const ctaPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--brand-500)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] active:bg-[var(--brand-700)]";
export const ctaOutline =
  "crm-outline inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--brand-500)] bg-white px-3.5 text-sm font-semibold text-[var(--brand-500)] hover:bg-[var(--brand-50)] active:bg-[var(--brand-100)]";
export const ctaGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 active:bg-slate-200";

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
    <div className={cn("rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]", className)}>
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
        "inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-semibold",
        tone === "ok" && "bg-green-50 text-[#16A34A]",
        tone === "warn" && "bg-amber-50 text-[#D97706]",
        tone === "danger" && "bg-rose-50 text-[#DC2626]",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
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
    <label className="block text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "h-10 w-full min-w-0 rounded-[8px] border border-[#E2E8F0] bg-white px-3 text-base text-[#0F172A] outline-none focus:ring-2 focus:ring-[var(--brand-500)]";
