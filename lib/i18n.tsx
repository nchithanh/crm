"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy, type Copy, type Lang } from "@/lib/copy";

const LANG_KEY = "dolphin-crm-lang";

type I18nValue = { lang: Lang; t: Copy; setLang: (lang: Lang) => void };

const I18nContext = createContext<I18nValue>({
  lang: "vi",
  t: copy.vi,
  setLang: () => {},
});

export function machineLang(): Lang {
  if (typeof navigator === "undefined") return "vi";
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

function storedLang(): Lang | null {
  try {
    const value = localStorage.getItem(LANG_KEY);
    return value === "vi" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  useEffect(() => {
    setLangState(storedLang() ?? machineLang());
  }, []);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* máy chặn lưu vẫn đổi trong phiên */
    }
  }, []);
  const value = useMemo(() => ({ lang, t: copy[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
