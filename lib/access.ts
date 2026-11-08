import type { AccessNavKey } from "@/lib/access-defaults";
import { ACCESS_NAV_KEYS } from "@/lib/access-defaults";
import { getStoredAuthMode } from "@/lib/auth-mode";
import type { TabKey } from "@/lib/tabs";
import { taskAssigneeIds } from "@/lib/task-people";
import { useAccessStore } from "@/stores/access-store";
import type { CourseAccessKey, Role } from "@/types";

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Login Ma Dance (API) — Tác vụ (+ boss: tạo tài khoản). */
export function isMaStudioMode() {
  return getStoredAuthMode() === "ma";
}

function isMaTasksPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/tasks" || path.startsWith("/tasks/") || path === "/tac-vu";
}

function isMaStaffPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/staff" || path.startsWith("/staff/");
}

function isMaAccessPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/settings/access" || path.startsWith("/settings/access/");
}

function isMaCoursesPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/courses" || path.startsWith("/courses/");
}

/** Path MA được phép theo role. */
export function isMaAllowedPath(pathname: string, role?: Role) {
  if (isMaTasksPath(pathname)) return true;
  if (isMaStaffPath(pathname) && role === "boss") return true;
  if (isMaAccessPath(pathname)) {
    if (role === "boss") return true;
    return useAccessStore.getState().hasNav(role, "access");
  }
  if (isMaCoursesPath(pathname)) {
    if (role === "boss") return true;
    return useAccessStore.getState().hasNav(role, "courses");
  }
  return false;
}

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

/** Write khóa theo ma trận `courses.actions` (Boss luôn true). */
export function canCourseAction(role: Role | undefined, key: CourseAccessKey) {
  return useAccessStore.getState().hasCourseAction(role, key);
}

/** Tạo task theo ma trận (Boss luôn true). */
export function canCreateTasks(role: Role | undefined) {
  return useAccessStore.getState().hasTaskAction(role, "create");
}

/** Tạo / xóa task theo ma trận (Boss luôn true). */
export function canManageTasks(role: Role | undefined) {
  const store = useAccessStore.getState();
  return store.hasTaskAction(role, "create") || store.hasTaskAction(role, "delete");
}

/** Xem mọi tác vụ — Boss luôn; role khác theo ma trận Phạm vi xem. */
export function canSeeAllTasks(role: Role | undefined) {
  return useAccessStore.getState().taskVisibility(role) === "all";
}

/** Tạo·sửa·xóa nhóm việc theo ma trận. */
export function canManageTaskParents(role: Role | undefined) {
  return useAccessStore.getState().hasTaskAction(role, "manageParents");
}

/** Người chịu trách nhiệm làm task (assignee). */
export function isTaskHandler(
  task: { assigneeId?: string; assigneeIds?: string[] },
  userId?: string,
) {
  if (!userId) return false;
  return taskAssigneeIds(task).includes(userId);
}

/** Người kiểm tra của task — luôn được sửa field (không thuộc ma trận). */
export function isTaskVerifier(task: { verifierId?: string }, userId?: string) {
  if (!userId) return false;
  return Boolean(task.verifierId && task.verifierId === userId);
}

/** Sửa nội dung field: Boss, verifier (cố định), hoặc role được Boss cấp `editFields`. */
export function canEditTaskFields(
  role: Role | undefined,
  task: { verifierId?: string },
  userId?: string,
) {
  if (role === "boss") return true;
  if (isTaskVerifier(task, userId)) return true;
  return useAccessStore.getState().hasTaskAction(role, "editFields");
}

export function canChangeTaskStatus(role: Role | undefined) {
  return useAccessStore.getState().hasTaskAction(role, "changeStatus");
}

export function canCommentTask(role: Role | undefined) {
  return useAccessStore.getState().hasTaskAction(role, "comment");
}

/**
 * Chạm task (xem scoped / đổi status trên task đang thấy):
 * xem all · người chịu trách nhiệm · verifier.
 * Không gồm create/delete — CTA tạo không được mở quyền đụng mọi task.
 */
export function canTouchTask(
  role: Role | undefined,
  task: { assigneeId?: string; assigneeIds?: string[]; verifierId?: string },
  userId?: string,
) {
  if (canSeeAllTasks(role)) return true;
  if (!userId) return false;
  return isTaskHandler(task, userId) || isTaskVerifier(task, userId);
}

/** Done: Boss, verifier (cố định), hoặc role được cấp `markDone`. */
export function canMarkTaskDone(
  role: Role | undefined,
  task: { verifierId?: string },
  userId?: string,
) {
  if (role === "boss") return true;
  if (isTaskVerifier(task, userId)) return true;
  return useAccessStore.getState().hasTaskAction(role, "markDone");
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
  if (path === "/guide" || path.startsWith("/guide/")) return "guide";
  if (path === "/settings/access" || path.startsWith("/settings/access/")) return "access";
  if (path === "/receipt") return "ledger";
  return null;
}

export function hrefToNavKey(href: string): AccessNavKey | null {
  return pathToNavKey(href);
}

export function canAccessPath(role: Role | undefined, pathname: string) {
  if (!role) return false;
  const path = normalizePath(pathname);
  if (path === "/login" || path === "/choose-vertical") return true;
  if (isMaStudioMode()) {
    if (path === "/menu") return true;
    return isMaAllowedPath(path, role);
  }
  if (role === "boss") return true;
  if (path === "/menu") return true;
  if (isMaStaffPath(path)) return false;
  const key = pathToNavKey(path);
  if (!key) return true;
  return useAccessStore.getState().hasNav(role, key);
}

export function canSeeNavHref(role: Role | undefined, href: string) {
  if (!role) return false;
  if (isMaStudioMode()) return isMaAllowedPath(href, role);
  if (isMaStaffPath(href)) return false;
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
  if (isMaStudioMode()) return "/tasks";
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
