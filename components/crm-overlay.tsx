"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const LEAVE_MS = 200;

/** Close with leave animation — same timing as `.crm-drawer-*` / `.crm-modal-*`. */
export function useOverlayClose(onClose: () => void, ms = LEAVE_MS) {
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function requestClose() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onCloseRef.current(), ms);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { leaving, requestClose };
}

type ShellProps = {
  leaving: boolean;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  panelClassName?: string;
};

/** Right-side detail drawer with backdrop + slide animation. */
export function CrmDrawerShell({ leaving, onClose, children, closeLabel, panelClassName }: ShellProps) {
  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end", leaving && "pointer-events-none")} role="presentation">
      <button
        type="button"
        className={cn("crm-drawer-backdrop absolute inset-0 bg-slate-900/40", leaving && "is-leaving")}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "crm-drawer-panel relative flex h-full w-[80%] max-w-[34rem] flex-col overflow-x-hidden bg-[var(--card)]",
          leaving && "is-leaving",
          panelClassName,
        )}
      >
        {children}
      </aside>
    </div>
  );
}

/** Center / bottom sheet modal with fade + soft rise. */
export function CrmModalShell({ leaving, onClose, children, closeLabel, panelClassName }: ShellProps) {
  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center", leaving && "pointer-events-none")}
      role="presentation"
    >
      <button
        type="button"
        className={cn("crm-drawer-backdrop absolute inset-0 bg-slate-900/40", leaving && "is-leaving")}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "crm-modal-panel relative w-full max-w-md rounded-2xl bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5",
          leaving && "is-leaving",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
