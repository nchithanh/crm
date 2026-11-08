"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CourseDetailScreen } from "@/components/course-detail-screen";
import { useI18n } from "@/lib/i18n";

function CourseViewInner() {
  const sp = useSearchParams();
  const code = (sp.get("code") ?? "").trim();
  return <CourseDetailScreen source={{ kind: "ma-code", code }} />;
}

/** MA course detail — 1 file static export, không phụ thuộc generateStaticParams. */
export default function CourseViewPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">{t.common.loading}</p>}>
      <CourseViewInner />
    </Suspense>
  );
}
