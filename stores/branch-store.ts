"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePageQuery } from "@/lib/page-query";

type BranchState = {
  branchId: string;
  setBranchId: (id: string) => void;
};

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branchId: "all",
      setBranchId: (branchId) => set({ branchId }),
    }),
    { name: "dolphin-crm-branch" },
  ),
);

/** Chi nhánh đang chọn. Query `?branch=` chỉ áp một lần để không ghi đè lựa chọn sau đó. */
export function useStudioBranch() {
  const branchId = useBranchStore((s) => s.branchId);
  const setBranchId = useBranchStore((s) => s.setBranchId);
  const { branch } = usePageQuery();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !branch) return;
    applied.current = true;
    if (branch !== branchId) setBranchId(branch);
  }, [branch, branchId, setBranchId]);

  return { branchId, setBranchId };
}
