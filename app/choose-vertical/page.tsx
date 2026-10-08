"use client";

import { useRouter } from "next/navigation";
import { Languages, Music, PersonStanding, Waves, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { reopenDb } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { setStoredVertical, VERTICALS, type VerticalId } from "@/lib/vertical";

const icons: Record<VerticalId, LucideIcon> = {
  nhay: PersonStanding,
  anh: Languages,
  nhac: Music,
  boi: Waves,
};

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
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-10">
      <BrandMark className="h-14 w-14" />
      <p className="mt-3 text-sm font-semibold text-slate-500">{t.brand}</p>
      <h1 className="mt-1 text-2xl font-bold">{t.choose.title}</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">{t.choose.lead}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {VERTICALS.map((v) => {
          const Icon = icons[v.id];
          return (
            <li key={v.id}>
              <button
                type="button"
                style={{ ["--v" as string]: v.color, ["--v-soft" as string]: v.soft }}
                className="flex h-full w-full items-start gap-3 rounded-[12px] border border-[#E2E8F0] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:border-[var(--v)]"
                onClick={() => {
                  setStoredVertical(v.id);
                  reopenDb(v.id);
                  router.push("/login");
                }}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--v-soft)] text-[var(--v)]">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-[#0F172A]">{v.label}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{t.choose[blurbs[v.id]]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
