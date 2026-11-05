/** Client-side resize/compress before CRM media upload (camera / large photos). */

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.72;
/** Skip work when already small enough (bytes). */
const SKIP_UNDER_BYTES = 900_000;

function outputName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "image";
  return `${base}.jpg`;
}

/**
 * Resize longest edge ≤ 1920px and re-encode as JPEG ~0.72.
 * GIF left as-is. On failure (e.g. HEIC unsupported) returns the original file.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  if (file.size <= SKIP_UNDER_BYTES && (file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/webp")) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width < 1 || height < 1) return file;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) return file;

    // Prefer compressed only when smaller (or we converted HEIC/PNG → JPEG)
    if (blob.size >= file.size && file.type === "image/jpeg") return file;

    return new File([blob], outputName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
