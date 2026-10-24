"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMaBranches,
  fetchMaParents,
  fetchMaStaff,
  fetchMaTasks,
  type MaBranch,
} from "@/lib/api/crm-tasks";
import type { StudioTask, TaskParent, User } from "@/types";

/** Load Tasks domain từ CRM API (mode MA). */
export function useMaTasksData(enabled: boolean) {
  const [tasks, setTasks] = useState<StudioTask[]>([]);
  const [parents, setParents] = useState<TaskParent[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [branches, setBranches] = useState<MaBranch[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const [t, p, s, b] = await Promise.all([
        fetchMaTasks(),
        fetchMaParents(),
        fetchMaStaff(),
        fetchMaBranches(),
      ]);
      setTasks(t);
      setParents(p);
      setStaff(s);
      setBranches(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fail");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tasks, parents, staff, branches, loading, error, reload, setTasks, setParents };
}
