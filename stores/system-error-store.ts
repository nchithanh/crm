"use client";

import { create } from "zustand";

export type SystemErrorKind = "client" | "server" | "network";

export type SystemErrorPayload = {
  kind: SystemErrorKind;
  status: number;
  /** Message hiển thị (đã resolve fallback nếu cần). */
  message: string;
};

type SystemErrorState = {
  open: boolean;
  payload: SystemErrorPayload | null;
  show: (payload: SystemErrorPayload) => void;
  clear: () => void;
};

export const useSystemErrorStore = create<SystemErrorState>((set) => ({
  open: false,
  payload: null,
  show: (payload) => set({ open: true, payload }),
  clear: () => set({ open: false, payload: null }),
}));

/** Báo lỗi API toàn app (crmFetch / crmUpload). 401 không gọi. */
export function reportSystemApiError(status: number, rawMessage: string) {
  if (status === 401) return;

  const trimmed = rawMessage.trim();
  const empty = !trimmed || trimmed === "fail" || trimmed === "unauthorized";

  if (status === 0 || rawMessage === "network") {
    useSystemErrorStore.getState().show({
      kind: "network",
      status: 0,
      message: trimmed && trimmed !== "network" && trimmed !== "fail" ? trimmed : "",
    });
    return;
  }

  if (status >= 500) {
    useSystemErrorStore.getState().show({
      kind: "server",
      status,
      message: empty ? "" : trimmed,
    });
    return;
  }

  useSystemErrorStore.getState().show({
    kind: "client",
    status,
    message: empty ? "" : trimmed,
  });
}
