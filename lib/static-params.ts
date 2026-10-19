/**
 * IDs for `generateStaticParams` (GitHub Pages `output: export`).
 * Class IDs mirror seed: `{courseId}-c{1..sessionCount}`.
 */
import nhay_courses from "@/data/nhay/courses.json";
import nhay_students from "@/data/nhay/students.json";
import nhay_users from "@/data/nhay/users.json";
import anh_courses from "@/data/anh/courses.json";
import anh_students from "@/data/anh/students.json";
import anh_users from "@/data/anh/users.json";
import nhac_courses from "@/data/nhac/courses.json";
import nhac_students from "@/data/nhac/students.json";
import nhac_users from "@/data/nhac/users.json";
import boi_courses from "@/data/boi/courses.json";
import boi_students from "@/data/boi/students.json";
import boi_users from "@/data/boi/users.json";

type CourseSeed = { id: string; sessionCount?: number };
type IdRow = { id: string; role?: string };

function uniq(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function asParams(ids: string[]) {
  return uniq(ids).map((id) => ({ id }));
}

const allCourses = [
  ...(nhay_courses as CourseSeed[]),
  ...(anh_courses as CourseSeed[]),
  ...(nhac_courses as CourseSeed[]),
  ...(boi_courses as CourseSeed[]),
];

const allStudents = [
  ...(nhay_students as IdRow[]),
  ...(anh_students as IdRow[]),
  ...(nhac_students as IdRow[]),
  ...(boi_students as IdRow[]),
];

const allUsers = [
  ...(nhay_users as IdRow[]),
  ...(anh_users as IdRow[]),
  ...(nhac_users as IdRow[]),
  ...(boi_users as IdRow[]),
];

export function courseStaticParams() {
  return asParams(allCourses.map((c) => c.id));
}

export function studentStaticParams() {
  return asParams(allStudents.map((s) => s.id));
}

export function teacherStaticParams() {
  return asParams(allUsers.filter((u) => u.role === "teacher").map((u) => u.id));
}

export function classStaticParams() {
  const ids: string[] = [];
  for (const c of allCourses) {
    const n = Math.max(1, c.sessionCount ?? 8);
    for (let i = 1; i <= n; i++) ids.push(`${c.id}-c${i}`);
  }
  return asParams(ids);
}

/** Social CTA posts — keep in sync with `buildSocialCtaSeed` in `lib/seed.ts` (17c). */
const SOCIAL_CTA_SEED = [
  { id: "sp-tiktok-hiphop", slug: "hk2x9a" },
  { id: "sp-fb-openday", slug: "fb7k2m" },
  { id: "sp-zalo-oa-trial", slug: "zl4n8p" },
  { id: "sp-ig-reel-kpop", slug: "ig9c2w" },
  { id: "sp-tiktok-ballet", slug: "bl3q7t" },
  { id: "sp-fb-boost-summer", slug: "sm5r1d" },
  { id: "sp-tiktok-duet", slug: "ct6m4e" },
  { id: "sp-other-qr-flyer", slug: "qr8h0k" },
  { id: "sp-tiktok-jazz", slug: "jz1a9c" },
  { id: "sp-zalo-story", slug: "zs2b7f" },
  { id: "sp-fb-moms", slug: "fm3d5h" },
  { id: "sp-ig-adult", slug: "ia4e6j" },
  { id: "sp-tiktok-challenge", slug: "ch5g8k" },
  { id: "sp-other-web", slug: "wb6h0m" },
] as const;

export function campaignStaticParams() {
  return asParams(SOCIAL_CTA_SEED.map((p) => p.id));
}

export function socialSlugStaticParams() {
  return uniq(SOCIAL_CTA_SEED.map((p) => p.slug)).map((slug) => ({ slug }));
}
