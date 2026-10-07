"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { db } from "@/lib/db";
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
        const user = await db.users.filter((u) => u.pin === pin.trim()).first();
        if (!user) throw new Error("Mã PIN không đúng");
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
