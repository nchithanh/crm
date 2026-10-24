"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { crmLogin, mapCrmRole } from "@/lib/api/crm-auth";
import { clearCrmSession, saveCrmSession } from "@/lib/api/crm-session";
import { db } from "@/lib/db";
import { bootStudio } from "@/lib/seed";
import { getStoredVertical } from "@/lib/vertical";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  loginWithPin: (pin: string) => Promise<User>;
  /** Ma Dance — POST /crm/login. */
  loginWithMaCredentials: (username: string, password: string) => Promise<User>;
  /** Local session; MA name/phone đã sync API riêng. */
  updateProfile: (patch: { name: string; phone: string; email: string; avatarColor?: string }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      loginWithPin: async (pin) => {
        const code = pin.trim();
        if (!code) throw new Error("bad-pin");
        const vertical = getStoredVertical();
        if (vertical) {
          await Promise.race([
            bootStudio(vertical),
            new Promise<never>((_, reject) => {
              window.setTimeout(() => reject(new Error("boot")), 5000);
            }),
          ]);
        }
        const user = await db.users.filter((u) => u.pin === code).first();
        if (!user) throw new Error("bad-pin");
        set({ user });
        return user;
      },
      loginWithMaCredentials: async (username, password) => {
        const data = await crmLogin(username, password);
        saveCrmSession(data);
        const user: User = {
          id: String(data.user.id),
          name: data.user.name,
          email: `${data.user.username}@${data.organization.code}`,
          phone: data.user.phone ?? "",
          role: mapCrmRole(data.user.role),
          pin: "",
          avatarColor: data.user.avatar_color?.trim() || "#6554C0",
        };
        set({ user });
        return user;
      },
      updateProfile: (patch) => {
        set((s) => {
          if (!s.user) return s;
          const name = patch.name.trim() || s.user.name;
          return {
            user: {
              ...s.user,
              name,
              phone: patch.phone.trim(),
              email: patch.email.trim() || s.user.email,
              avatarColor: patch.avatarColor?.trim() || s.user.avatarColor,
            },
          };
        });
      },
      logout: () => {
        clearCrmSession();
        set({ user: null });
      },
    }),
    {
      name: "dolphin-crm-auth",
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
