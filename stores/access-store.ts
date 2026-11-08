"use client";

import { create } from "zustand";
import {
  defaultAllRoleAccess,
  defaultRoleAccess,
  mergeWithDefaults,
  type AccessNavKey,
  type MatrixRole,
  MATRIX_ROLES,
} from "@/lib/access-defaults";
import { fetchMaAccessMatrix, putMaAccessMatrix } from "@/lib/api/crm-access";
import { getStoredAuthMode } from "@/lib/auth-mode";
import type { TabKey } from "@/lib/tabs";
import { db } from "@/lib/db";
import type { Role, RoleAccess, TaskAccess, TaskAccessKey, TaskVisibility } from "@/types";

type AccessState = {
  byRole: Record<MatrixRole, RoleAccess>;
  revision: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** MA: kéo lại matrix từ API (im lặng nếu lỗi — giữ bản cũ). */
  refreshMa: () => Promise<void>;
  setNav: (role: MatrixRole, key: AccessNavKey, on: boolean) => Promise<void>;
  setTab: (role: MatrixRole, key: TabKey, on: boolean) => Promise<void>;
  setTaskVisibility: (role: MatrixRole, visibility: TaskVisibility) => Promise<void>;
  setTaskAction: (role: MatrixRole, key: TaskAccessKey, on: boolean) => Promise<void>;
  resetDefaults: () => Promise<void>;
  hasNav: (role: Role | undefined, key: AccessNavKey) => boolean;
  hasTab: (role: Role | undefined, key: TabKey) => boolean;
  taskPack: (role: Role | undefined) => TaskAccess | null;
  hasTaskAction: (role: Role | undefined, key: TaskAccessKey) => boolean;
  taskVisibility: (role: Role | undefined) => TaskVisibility;
  canEditMatrix: (role: Role | undefined) => boolean;
};

function emptyMap(): Record<MatrixRole, RoleAccess> {
  return Object.fromEntries(MATRIX_ROLES.map((r) => [r, defaultRoleAccess(r)])) as Record<
    MatrixRole,
    RoleAccess
  >;
}

function isMaMode() {
  return getStoredAuthMode() === "ma";
}

function packFor(role: Role | undefined, get: () => AccessState): TaskAccess | null {
  if (!role) return null;
  if (role === "boss") {
    return {
      visibility: "all",
      actions: {
        create: true,
        delete: true,
        changeStatus: true,
        comment: true,
        markDone: true,
        manageParents: true,
        editFields: true,
      },
    };
  }
  const row = get().byRole[role as MatrixRole] ?? defaultRoleAccess(role as MatrixRole);
  return row.tasks ?? defaultRoleAccess(role as MatrixRole).tasks!;
}

function mapFromRows(rows: RoleAccess[]): Record<MatrixRole, RoleAccess> {
  const map = emptyMap();
  for (const role of MATRIX_ROLES) {
    const found = rows.find((r) => r.id === role);
    map[role] = mergeWithDefaults(found, role);
  }
  return map;
}

async function persistMa(byRole: Record<MatrixRole, RoleAccess>) {
  const rows = MATRIX_ROLES.map((role) => byRole[role]);
  const saved = await putMaAccessMatrix(rows);
  return mapFromRows(saved);
}

export const useAccessStore = create<AccessState>((set, get) => ({
  byRole: emptyMap(),
  revision: 0,
  hydrated: false,

  hydrate: async () => {
    if (isMaMode()) {
      try {
        const remote = await fetchMaAccessMatrix();
        const map = mapFromRows(remote);
        set({ byRole: map, hydrated: true, revision: get().revision + 1 });
        return;
      } catch {
        // fallback defaults nếu API lỗi (offline) — vẫn cho UI mở
        set({ byRole: emptyMap(), hydrated: true, revision: get().revision + 1 });
        return;
      }
    }

    const rows = await db.roleAccess.toArray();
    const map = emptyMap();
    for (const role of MATRIX_ROLES) {
      const found = rows.find((r) => r.id === role);
      map[role] = mergeWithDefaults(found, role);
      if (!found) await db.roleAccess.put(map[role]);
      else if (!found.tasks) await db.roleAccess.put(map[role]);
    }
    set({ byRole: map, hydrated: true, revision: get().revision + 1 });
  },

  refreshMa: async () => {
    if (!isMaMode()) return;
    try {
      const remote = await fetchMaAccessMatrix({ silentError: true });
      const map = mapFromRows(remote);
      const prev = get().byRole;
      if (JSON.stringify(prev) === JSON.stringify(map)) {
        if (!get().hydrated) set({ hydrated: true });
        return;
      }
      set({ byRole: map, hydrated: true, revision: get().revision + 1 });
    } catch {
      // giữ matrix cũ
    }
  },

  setNav: async (role, key, on) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const next: RoleAccess = {
      ...current,
      items: { ...current.items, [key]: on },
    };
    const byRole = { ...get().byRole, [role]: next };
    if (isMaMode()) {
      const map = await persistMa(byRole);
      set({ byRole: map, revision: get().revision + 1 });
      return;
    }
    await db.roleAccess.put(next);
    set({ byRole, revision: get().revision + 1 });
  },

  setTab: async (role, key, on) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const next: RoleAccess = {
      ...current,
      tabs: { ...current.tabs, [key]: on },
    };
    const byRole = { ...get().byRole, [role]: next };
    if (isMaMode()) {
      const map = await persistMa(byRole);
      set({ byRole: map, revision: get().revision + 1 });
      return;
    }
    await db.roleAccess.put(next);
    set({ byRole, revision: get().revision + 1 });
  },

  setTaskVisibility: async (role, visibility) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const tasks = { ...(current.tasks as TaskAccess), visibility };
    const next: RoleAccess = { ...current, tasks };
    const byRole = { ...get().byRole, [role]: next };
    if (isMaMode()) {
      const map = await persistMa(byRole);
      set({ byRole: map, revision: get().revision + 1 });
      return;
    }
    await db.roleAccess.put(next);
    set({ byRole, revision: get().revision + 1 });
  },

  setTaskAction: async (role, key, on) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const tasks: TaskAccess = {
      ...(current.tasks as TaskAccess),
      actions: { ...(current.tasks as TaskAccess).actions, [key]: on },
    };
    const next: RoleAccess = { ...current, tasks };
    const byRole = { ...get().byRole, [role]: next };
    if (isMaMode()) {
      const map = await persistMa(byRole);
      set({ byRole: map, revision: get().revision + 1 });
      return;
    }
    await db.roleAccess.put(next);
    set({ byRole, revision: get().revision + 1 });
  },

  resetDefaults: async () => {
    const rows = defaultAllRoleAccess();
    if (isMaMode()) {
      const map = await persistMa(
        Object.fromEntries(rows.map((r) => [r.id, r])) as Record<MatrixRole, RoleAccess>,
      );
      set({ byRole: map, revision: get().revision + 1 });
      return;
    }
    await db.transaction("rw", db.roleAccess, async () => {
      await db.roleAccess.clear();
      await db.roleAccess.bulkPut(rows);
    });
    const map = Object.fromEntries(rows.map((r) => [r.id, r])) as Record<MatrixRole, RoleAccess>;
    set({ byRole: map, revision: get().revision + 1 });
  },

  hasNav: (role, key) => {
    if (!role) return false;
    if (role === "boss") return true;
    const row = get().byRole[role as MatrixRole] ?? defaultRoleAccess(role as MatrixRole);
    return row.items[key] !== false;
  },

  hasTab: (role, key) => {
    if (!role) return false;
    if (role === "boss") return true;
    const row = get().byRole[role as MatrixRole] ?? defaultRoleAccess(role as MatrixRole);
    return row.tabs[key] !== false;
  },

  taskPack: (role) => packFor(role, get),

  hasTaskAction: (role, key) => {
    const pack = packFor(role, get);
    if (!pack) return false;
    return pack.actions[key] !== false;
  },

  taskVisibility: (role) => {
    const pack = packFor(role, get);
    if (!pack) return "mine";
    return pack.visibility;
  },

  /** Chỉ Boss sửa ma trận. Admin/role khác chỉ xem khi được cấp menu Phân quyền. */
  canEditMatrix: (role) => role === "boss",
}));
