import type { ReactNode } from "react";
import { socialSlugStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return socialSlugStaticParams();
}

export default function PublicJoinLayout({ children }: { children: ReactNode }) {
  return children;
}
