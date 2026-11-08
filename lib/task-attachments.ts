/** Accept attribute + helpers cho đính kèm task (ảnh + PDF). */

export const TASK_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export type AttachmentKind = "image" | "pdf";

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isAllowedTaskMedia(file: File) {
  return file.type.startsWith("image/") || isPdfFile(file);
}

export function isPdfUrl(url: string) {
  try {
    const path = new URL(url, "https://local.invalid").pathname.toLowerCase();
    if (path.endsWith(".pdf")) return true;
  } catch {
    /* ignore */
  }
  return /\.pdf(\?|#|$)/i.test(url);
}

export function kindForAttachment(url: string, file?: File): AttachmentKind {
  if (file && isPdfFile(file)) return "pdf";
  if (isPdfUrl(url)) return "pdf";
  return "image";
}

export function kindsFromFiles(files: File[]): AttachmentKind[] {
  return files.map((f) => (isPdfFile(f) ? "pdf" : "image"));
}
