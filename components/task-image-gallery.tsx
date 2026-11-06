"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Spinner } from "@/components/ui";

type Props = {
  urls: string[];
  viewLabel: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  counterLabel: (current: number, total: number) => string;
  removeLabel?: string;
  onRemove?: (index: number) => void;
  busy?: boolean;
  pending?: boolean;
};

export function TaskImageGallery({
  urls,
  viewLabel,
  closeLabel,
  prevLabel,
  nextLabel,
  counterLabel,
  removeLabel,
  onRemove,
  busy = false,
  pending = false,
}: Props) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const open = openAt !== null && urls[openAt];
  const currentSrc = openAt !== null ? urls[openAt] : "";

  function step(delta: number) {
    setOpenAt((i) => {
      if (i === null || urls.length < 2) return i;
      return (i + delta + urls.length) % urls.length;
    });
  }

  useEffect(() => {
    if (openAt === null) return;
    if (openAt >= urls.length) setOpenAt(urls.length ? urls.length - 1 : null);
  }, [openAt, urls.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (e.key === "Escape") setOpenAt(null);
      if (e.key === "ArrowLeft" && urls.length > 1) step(-1);
      if (e.key === "ArrowRight" && urls.length > 1) step(1);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, urls.length]);

  if (urls.length === 0) return null;

  const lightbox =
    open && openAt !== null && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={viewLabel}>
            <button
              type="button"
              className="absolute inset-0 bg-black/85"
              aria-label={closeLabel}
              onClick={() => setOpenAt(null)}
            />
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-4 sm:p-10">
              {loadedSrc !== currentSrc ? (
                <Spinner className="absolute h-8 w-8 text-white" />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc}
                alt={viewLabel}
                className="pointer-events-none max-h-[85svh] max-w-full object-contain"
                onLoad={() => setLoadedSrc(currentSrc)}
                onError={() => setLoadedSrc(currentSrc)}
              />
            </div>
            <button
              type="button"
              className="absolute top-3 right-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900"
              aria-label={closeLabel}
              onClick={() => setOpenAt(null)}
            >
              <X size={18} />
            </button>
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {counterLabel(openAt + 1, urls.length)}
            </p>
            {urls.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 z-20 w-[34%]"
                  aria-label={prevLabel}
                  onClick={() => step(-1)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 z-20 w-[34%]"
                  aria-label={nextLabel}
                  onClick={() => step(1)}
                />
                <span className="pointer-events-none absolute top-1/2 left-3 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900">
                  <ChevronLeft size={20} />
                </span>
                <span className="pointer-events-none absolute top-1/2 right-3 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900">
                  <ChevronRight size={20} />
                </span>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((src, index) => (
          <div key={`${src}-${index}`} className="relative">
            <button
              type="button"
              className="group relative block h-28 w-28 overflow-hidden rounded-xl border border-[var(--border)] bg-slate-100"
              aria-label={viewLabel}
              disabled={busy}
              onClick={() => setOpenAt(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {pending ? (
                <span className="pointer-events-none absolute inset-0 rounded-xl border border-dashed border-[var(--brand-500)]" />
              ) : null}
              <span className="pointer-events-none absolute right-1 bottom-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                <ZoomIn size={13} />
              </span>
            </button>
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                <Spinner className="text-[var(--brand-500)]" />
              </div>
            ) : onRemove ? (
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-white/95 p-1 text-slate-600 shadow"
                aria-label={removeLabel}
                onClick={() => onRemove(index)}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {lightbox}
    </>
  );
}
