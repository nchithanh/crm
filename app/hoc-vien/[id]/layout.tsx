import type { ReactNode } from "react";
import students from "@/data/nhay/students.json";

export function generateStaticParams() {
  return students.map((s) => ({ id: s.id }));
}

export const dynamicParams = false;

export default function StudentLayout({ children }: { children: ReactNode }) {
  return children;
}
