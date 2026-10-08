import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const ctaPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-[#EA580C]";
export const ctaOutline =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#F97316] bg-white px-4 text-sm font-semibold text-[#C2410C] hover:bg-orange-50";
export const ctaGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100";

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
    <div className={cn("rounded-[12px] border border-slate-200 bg-white shadow-sm", className)}>
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
  "h-11 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#F97316]";
