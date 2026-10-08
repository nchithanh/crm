import type { ReactNode } from "react";
import { classStaticParams } from "@/lib/static-params";

/** Legacy schedule detail → redirects to `/classes/[id]`. */
export function generateStaticParams() {
  return classStaticParams();
}

export default function ScheduleIdLayout({ children }: { children: ReactNode }) {
  return children;
}
