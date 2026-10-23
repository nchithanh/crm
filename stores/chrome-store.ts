import { create } from "zustand";

/** Chrome mobile (search + bottom nav + Ask Dolphin) ẩn khi scroll xuống. */
type ChromeState = {
  navHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
};

export const useChromeStore = create<ChromeState>((set) => ({
  navHidden: false,
  setNavHidden: (hidden) => set({ navHidden: hidden }),
}));
