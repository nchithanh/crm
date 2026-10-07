"use client";

import { useEffect, useState } from "react";

export function usePageQuery() {
  const [branch, setBranch] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [student, setStudent] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setBranch(q.get("branch"));
    setClassId(q.get("class"));
    setStage(q.get("stage"));
    setStudent(q.get("student"));
  }, []);
  return { branch, classId, stage, student };
}
