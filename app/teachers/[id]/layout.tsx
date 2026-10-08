import type { ReactNode } from "react";
import { teacherStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return teacherStaticParams();
}

export default function TeacherDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
