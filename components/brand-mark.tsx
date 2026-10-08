const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Logo Dolphin Software. Giữ màu ảnh gốc, không tô theo màu lĩnh vực. */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src={`${basePath}/brand/logo-dolphin.webp`}
      alt="Dolphin"
      width={40}
      height={40}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
