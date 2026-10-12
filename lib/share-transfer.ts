/** Cùng thứ tự POS: share sheet (kèm ảnh nếu có) → không được thì copy và mở Zalo. */
export async function shareTransferNotice(input: {
  title: string;
  text: string;
  imageUrl?: string;
  phone?: string;
}): Promise<"shared" | "copied" | "aborted"> {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  try {
    if (typeof navigator.share === "function") {
      // Ảnh data URL thì kèm file như POS. Ảnh SePay là URL ngoài — không fetch trước share,
      // vì chờ mạng sẽ mất user gesture và share sheet không mở.
      if (input.imageUrl?.startsWith("data:")) {
        try {
          const blob = await (await fetch(input.imageUrl)).blob();
          const file = new File([blob], "chuyen-khoan-hoc-phi.png", { type: blob.type || "image/png" });
          const withFile = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
          if (withFile) {
            await navigator.share({ title: input.title, text: input.text, files: [file] });
            return "shared";
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return "aborted";
        }
      }
      try {
        await navigator.share({ title: input.title, text: input.text });
        return "shared";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return "aborted";
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "aborted";
  }
  try {
    await navigator.clipboard.writeText(input.text);
  } catch {
    /* vẫn mở Zalo */
  }
  if (digits) window.open(`https://zalo.me/${digits}`, "_blank", "noopener,noreferrer");
  return "copied";
}
