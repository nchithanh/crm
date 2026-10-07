"use client";

import { useRouter } from "next/navigation";
import { reopenDb } from "@/lib/db";
import { setStoredVertical, VERTICALS } from "@/lib/vertical";

export default function ChooseVerticalPage() {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-sm font-semibold text-emerald-700">Dolphin CRM</p>
      <h1 className="mt-1 text-2xl font-bold">Chọn lĩnh vực</h1>
      <p className="mt-2 text-sm text-slate-500">
        Mỗi lĩnh vực một bộ JSON và một cơ sở dữ liệu trên máy. Trước mắt có trung tâm dạy nhảy.
      </p>
      <ul className="mt-6 space-y-3">
        {VERTICALS.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[12px] border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-500"
              onClick={() => {
                setStoredVertical(v.id);
                reopenDb(v.id);
                router.push("/login");
              }}
            >
              <span className="text-2xl" aria-hidden>
                {v.emoji}
              </span>
              <span>
                <span className="block font-semibold">{v.label}</span>
                <span className="text-sm text-slate-500">{v.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
