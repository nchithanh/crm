"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — chọn lĩnh vực nằm trong `/login`. */
export default function ChooseVerticalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
