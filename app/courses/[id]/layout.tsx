import type { ReactNode } from "react";
import { courseStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return courseStaticParams();
}

export default function CourseDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
