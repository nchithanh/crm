import type { ReactNode } from "react";
import { studentStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return studentStaticParams();
}

export default function StudentDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
