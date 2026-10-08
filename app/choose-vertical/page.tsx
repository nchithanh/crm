"use client";

import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { reopenDb } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { setStoredVertical, VERTICALS, type VerticalId } from "@/lib/vertical";

const blurbs: Record<VerticalId, "dance" | "english" | "music" | "swim"> = {
  nhay: "dance",
  anh: "english",
  nhac: "music",
  boi: "swim",
};

export default function ChooseVerticalPage() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark className="mb-3 h-14 w-14" />
        <p className="text-sm font-semibold text-[var(--brand-600)]">{t.brand}</p>
        <h1 className="crm-page-title mt-1">{t.choose.title}</h1>
        <p className="crm-lead mt-2 max-w-md">{t.choose.lead}</p>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {VERTICALS.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-slate-300"
              onClick={() => {
                setStoredVertical(v.id);
                reopenDb(v.id);
                router.push("/login");
              }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-2xl"
                style={{ backgroundColor: v.soft }}
                aria-hidden
              >
                {v.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-slate-900">{v.label}</span>
                <span className="mt-0.5 block text-sm text-slate-700">{t.choose[blurbs[v.id]]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
