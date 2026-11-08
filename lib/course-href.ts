/** Href chi tiết khóa — MA dùng code (static export); demo dùng id seed. */
export function courseDetailHref(
  course: { id: string; code?: string },
  maMode: boolean,
): string {
  if (maMode) {
    const code = (course.code || course.id).trim();
    return `/courses/view/?code=${encodeURIComponent(code)}`;
  }
  return `/courses/${course.id}`;
}
