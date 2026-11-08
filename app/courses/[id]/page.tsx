"use client";

import { useParams } from "next/navigation";
import { CourseDetailScreen } from "@/components/course-detail-screen";
import { ClientRedirect } from "@/components/client-redirect";
import { isMaStudioMode } from "@/lib/access";

/** Demo seed detail (`/courses/{id}/`). MA dùng `/courses/view/?code=`. */
export default function CourseDetailByIdPage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  if (isMaStudioMode()) {
    return <ClientRedirect href="/courses" />;
  }

  return <CourseDetailScreen source={{ kind: "demo-id", id }} />;
}
