import type { ReactNode } from "react";
import classes from "@/data/nhay/classes.json";

export function generateStaticParams() {
  return classes.map((c) => ({ id: c.id }));
}

export const dynamicParams = false;

export default function ClassLayout({ children }: { children: ReactNode }) {
  return children;
}
