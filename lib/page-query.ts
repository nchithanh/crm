"use client";

import { useEffect, useState } from "react";

export function usePageQuery() {
  const [branch, setBranch] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setBranch(q.get("branch"));
    setClassId(q.get("class"));
  }, []);
  return { branch, classId };
}
