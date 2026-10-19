import type { AccessNavKey } from "@/lib/access-defaults";
import { ACCESS_NAV_KEYS } from "@/lib/access-defaults";
import type { TabKey } from "@/lib/tabs";
import { useAccessStore } from "@/stores/access-store";
import type { Role } from "@/types";

export function canSeeContact(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "reception" || role === "marketing";
}

export function canSeeMoney(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "reception";
}

export function canApproveHold(role: Role | undefined) {
  return role === "boss" || role === "owner";
}

export function canEditSchedule(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "teacher";
}

export function canCollect(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "reception";
}

export function canManageCatalog(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "reception";
}

export function canManageTasks(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "reception" || role === "marketing";
}

export function canManagePaymentAccounts(role: Role | undefined) {
  return role === "boss" || role === "owner";
}

export function canManagePromotions(role: Role | undefined) {
  return role === "boss" || role === "owner" || role === "marketing";
}

export function canEditAccessMatrix(role: Role | undefined) {
  return useAccessStore.getState().canEditMatrix(role);
}

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Map path → nav key trong ma trận. null = luôn cho phép nếu đã đăng nhập (vd /menu). */
export function pathToNavKey(pathname: string): AccessNavKey | null {
  const path = normalizePath(pathname);
  if (path === "/" || path === "/overview") return "overview";
  if (path === "/schedule" || path.startsWith("/schedule/")) return "schedule";
  if (path === "/students" || path.startsWith("/students/")) return "students";
  if (path === "/courses" || path.startsWith("/courses/")) return "courses";
  if (path === "/classes" || path.startsWith("/classes/")) return "classes";
  if (path === "/teachers" || path.startsWith("/teachers/")) return "teachers";
  if (path === "/rooms" || path.startsWith("/rooms/")) return "rooms";
  if (path === "/subscriptions" || path.startsWith("/subscriptions/")) return "packages";
  if (path === "/mid-course-enroll" || path.startsWith("/mid-course-enroll/")) return "midEnroll";
  if (path === "/promotion" || path.startsWith("/promotion/")) return "promotion";
  if (path === "/follow-up" || path.startsWith("/follow-up/") || path === "/cham-soc") return "care";
  if (path === "/campaigns" || path.startsWith("/campaigns/")) return "campaigns";
  if (path === "/finance" || path.startsWith("/finance/")) return "financeOverview";
  if (path === "/collect-fees" || path.startsWith("/collect-fees/")) return "collect";
  if (path === "/receivables" || path.startsWith("/receivables/") || path === "/cong-no") return "debts";
  if (path === "/revenue" || path.startsWith("/revenue/") || path === "/doanh-thu") return "revenue";
  if (path === "/collections" || path.startsWith("/collections/")) return "ledger";
  if (path === "/payment-accounts" || path.startsWith("/payment-accounts/")) return "payAccounts";
  if (path === "/attendance" || path.startsWith("/attendance/") || path === "/diem-danh") return "attend";
  if (path === "/qr-attendance" || path.startsWith("/qr-attendance/") || path === "/diem-danh-qr") return "attendQr";
  if (path === "/holds" || path.startsWith("/holds/") || path === "/bao-luu") return "holds";
  if (path === "/tasks" || path.startsWith("/tasks/") || path === "/tac-vu") return "tasks";
  if (path === "/room-bookings" || path.startsWith("/room-bookings/") || path === "/dat-phong") return "bookings";
  if (path === "/dolphin-ai" || path.startsWith("/dolphin-ai/") || path === "/ai") return "ai";
  if (path === "/settings/access" || path.startsWith("/settings/access/")) return "access";
  if (path === "/receipt") return "ledger";
  return null;
}

export function hrefToNavKey(href: string): AccessNavKey | null {
  return pathToNavKey(href);
}

export function canAccessPath(role: Role | undefined, pathname: string) {
  if (!role) return false;
  if (role === "boss") return true;
  const path = normalizePath(pathname);
  if (path === "/menu" || path === "/login" || path === "/choose-vertical") return true;
  const key = pathToNavKey(path);
  if (!key) return true;
  return useAccessStore.getState().hasNav(role, key);
}

export function canSeeNavHref(role: Role | undefined, href: string) {
  if (!role) return false;
  if (role === "boss") return true;
  const key = hrefToNavKey(href);
  if (!key) return true;
  return useAccessStore.getState().hasNav(role, key);
}

export function canSeeTab(role: Role | undefined, key: TabKey) {
  return useAccessStore.getState().hasTab(role, key);
}

/** Trang về khi role không vào được path hiện tại. */
export function homePathForRole(role: Role | undefined) {
  if (!role) return "/login";
  for (const key of ACCESS_NAV_KEYS) {
    if (key === "access") continue;
    if (!useAccessStore.getState().hasNav(role, key)) continue;
    if (key === "overview") return "/overview";
    if (key === "schedule") return "/schedule";
    if (key === "students") return "/students";
    if (key === "tasks") return "/tasks";
    if (key === "care") return "/follow-up";
    if (key === "ai") return "/dolphin-ai";
  }
  return "/menu";
}
