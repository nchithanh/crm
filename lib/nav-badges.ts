import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useStudioBranch } from "@/stores/branch-store";

/** Semantic cho số trên nav — không dùng brand tím cho mọi đếm. */
export type NavBadgeKind = "count" | "warn" | "danger";

export function navBadgeKind(href: string): NavBadgeKind {
  if (href === "/collect-fees") return "danger";
  if (href === "/follow-up") return "warn";
  return "count";
}

/** Dark sidebar / raised tab */
export function navBadgeClassDark(kind: NavBadgeKind) {
  if (kind === "danger") return "bg-rose-500 text-white";
  if (kind === "warn") return "bg-amber-500 text-white";
  return "bg-slate-500 text-white";
}

/** Light surfaces (/menu, bottom tab non-raised) */
export function navBadgeClassLight(kind: NavBadgeKind) {
  if (kind === "danger") return "bg-rose-500 text-white";
  if (kind === "warn") return "bg-amber-500 text-white";
  return "bg-slate-200 text-slate-700";
}

/** Badge số trên nav — dùng bởi sidebar desktop và trang /menu. */
export function useNavBadges(): Partial<Record<string, number>> {
  const { branchId } = useStudioBranch();
  const leads = useLiveQuery(() => db.leads.toArray(), []) ?? [];
  const roster = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.classes.toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.toArray(), []) ?? [];
  const inBranch = (id: string | undefined) => branchId === "all" || id === branchId;
  const openLeads = leads.filter((lead) => lead.stage !== "won" && lead.stage !== "lost").length;
  const owing = roster.filter((student) => student.debt > 0 && inBranch(student.branchId)).length;
  return {
    "/students": roster.filter((student) => student.status === "active" && inBranch(student.branchId)).length,
    "/courses": courses.filter((course) => course.active && inBranch(course.branchId)).length,
    "/classes": sessions.filter((session) => (session.status === "upcoming" || session.status === "ongoing") && inBranch(session.branchId)).length,
    "/teachers": users.filter((person) => person.role === "teacher" && person.teacherStatus === "active" && inBranch(person.branchId)).length,
    "/follow-up": openLeads,
    "/collect-fees": owing,
  };
}
