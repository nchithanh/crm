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
import type { TabKey } from "@/lib/tabs";
import { db } from "@/lib/db";
import type { Role, RoleAccess } from "@/types";

type AccessState = {
  byRole: Record<MatrixRole, RoleAccess>;
  revision: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setNav: (role: MatrixRole, key: AccessNavKey, on: boolean) => Promise<void>;
  setTab: (role: MatrixRole, key: TabKey, on: boolean) => Promise<void>;
  resetDefaults: () => Promise<void>;
  hasNav: (role: Role | undefined, key: AccessNavKey) => boolean;
  hasTab: (role: Role | undefined, key: TabKey) => boolean;
  canEditMatrix: (role: Role | undefined) => boolean;
};

function emptyMap(): Record<MatrixRole, RoleAccess> {
  return Object.fromEntries(MATRIX_ROLES.map((r) => [r, defaultRoleAccess(r)])) as Record<
    MatrixRole,
    RoleAccess
  >;
}

export const useAccessStore = create<AccessState>((set, get) => ({
  byRole: emptyMap(),
  revision: 0,
  hydrated: false,

  hydrate: async () => {
    const rows = await db.roleAccess.toArray();
    const map = emptyMap();
    for (const role of MATRIX_ROLES) {
      const found = rows.find((r) => r.id === role);
      map[role] = mergeWithDefaults(found, role);
      if (!found) await db.roleAccess.put(map[role]);
    }
    set({ byRole: map, hydrated: true, revision: get().revision + 1 });
  },

  setNav: async (role, key, on) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const next: RoleAccess = {
      ...current,
      items: { ...current.items, [key]: on },
    };
    await db.roleAccess.put(next);
    set((s) => ({
      byRole: { ...s.byRole, [role]: next },
      revision: s.revision + 1,
    }));
  },

  setTab: async (role, key, on) => {
    const current = mergeWithDefaults(get().byRole[role], role);
    const next: RoleAccess = {
      ...current,
      tabs: { ...current.tabs, [key]: on },
    };
    await db.roleAccess.put(next);
    set((s) => ({
      byRole: { ...s.byRole, [role]: next },
      revision: s.revision + 1,
    }));
  },

  resetDefaults: async () => {
    const rows = defaultAllRoleAccess();
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

  canEditMatrix: (role) => role === "boss" || role === "owner",
}));
