import type { ReactNode } from "react";
import { classStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return classStaticParams();
}

export default function LegacyLichLayout({ children }: { children: ReactNode }) {
  return children;
}
