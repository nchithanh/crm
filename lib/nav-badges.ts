import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useStudioBranch } from "@/stores/branch-store";

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
