const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Headset + chat bubble. Pass className for size; use invert on brand surfaces. */
export function SupportIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <img
      src={`${basePath}/brand/support.png`}
      alt=""
      width={22}
      height={22}
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
