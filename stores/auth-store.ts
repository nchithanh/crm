"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { db } from "@/lib/db";
import { bootStudio } from "@/lib/seed";
import { getStoredVertical } from "@/lib/vertical";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  loginWithPin: (pin: string) => Promise<User>;
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
      logout: () => set({ user: null }),
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
