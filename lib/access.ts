import type { Role } from "@/types";

export function canSeeContact(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canSeeMoney(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canApproveHold(role: Role | undefined) {
  return role === "owner";
}

export function canEditSchedule(role: Role | undefined) {
  return role === "owner" || role === "teacher";
}

export function canCollect(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canManageCatalog(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canManageTasks(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

/** Paths giáo viên được vào (prefix match). Owner / lễ tân: mọi path app. */
const TEACHER_PATHS = [
  "/",
  "/overview",
  "/schedule",
  "/students",
  "/courses",
  "/classes",
  "/attendance",
  "/qr-attendance",
  "/tasks",
  // legacy during transition
  "/diem-danh",
  "/diem-danh-qr",
  "/tac-vu",
] as const;

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function canAccessPath(role: Role | undefined, pathname: string) {
  if (!role) return false;
  if (role === "owner" || role === "reception") return true;
  const path = normalizePath(pathname);
  return TEACHER_PATHS.some((allowed) => {
    if (allowed === "/") return path === "/" || path === "/overview";
    return path === allowed || path.startsWith(`${allowed}/`);
  });
}

export function canSeeNavHref(role: Role | undefined, href: string) {
  return canAccessPath(role, href);
}
