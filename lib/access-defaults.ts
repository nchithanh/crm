import type { NavItemKey } from "@/lib/nav";
import type { TabKey } from "@/lib/tabs";
import { TAB_DEFS } from "@/lib/tabs";
import type { Role, RoleAccess } from "@/types";

/** Role có cột trong ma trận (Boss luôn bật, không lưu override). */
export type MatrixRole = Exclude<Role, "boss">;

export const MATRIX_ROLES: MatrixRole[] = ["owner", "reception", "teacher", "marketing"];

export const ALL_ROLES: Role[] = ["boss", "owner", "reception", "teacher", "marketing"];

/** Nav keys trong ma trận — gồm Phân quyền. */
export type AccessNavKey = NavItemKey | "access";

export const ACCESS_NAV_KEYS: AccessNavKey[] = [
  "overview",
  "schedule",
  "students",
  "courses",
  "classes",
  "teachers",
  "rooms",
  "packages",
  "midEnroll",
  "promotion",
  "care",
  "campaigns",
  "financeOverview",
  "collect",
  "debts",
  "revenue",
  "ledger",
  "payAccounts",
  "attend",
  "attendQr",
  "holds",
  "tasks",
  "bookings",
  "ai",
  "access",
];

const yes = true;
const no = false;

/** Mặc định menu theo role (Boss = tất cả true, không lưu). */
export const DEFAULT_NAV: Record<MatrixRole, Record<AccessNavKey, boolean>> = {
  owner: Object.fromEntries(ACCESS_NAV_KEYS.map((k) => [k, yes])) as Record<AccessNavKey, boolean>,
  reception: {
    overview: yes,
    schedule: yes,
    students: yes,
    courses: yes,
    classes: yes,
    teachers: yes,
    rooms: yes,
    packages: yes,
    midEnroll: yes,
    promotion: no,
    care: yes,
    campaigns: no,
    financeOverview: yes,
    collect: yes,
    debts: yes,
    revenue: no,
    ledger: no,
    payAccounts: no,
    attend: yes,
    attendQr: yes,
    holds: yes,
    tasks: yes,
    bookings: yes,
    ai: yes,
    access: no,
  },
  teacher: {
    overview: yes,
    schedule: yes,
    students: yes,
    courses: yes,
    classes: yes,
    teachers: no,
    rooms: no,
    packages: no,
    midEnroll: no,
    promotion: no,
    care: no,
    campaigns: no,
    financeOverview: no,
    collect: no,
    debts: no,
    revenue: no,
    ledger: no,
    payAccounts: no,
    attend: yes,
    attendQr: yes,
    holds: no,
    tasks: yes,
    bookings: no,
    ai: yes,
    access: no,
  },
  marketing: {
    overview: yes,
    schedule: yes,
    students: yes,
    courses: yes,
    classes: yes,
    teachers: no,
    rooms: no,
    packages: no,
    midEnroll: no,
    promotion: yes,
    care: yes,
    campaigns: yes,
    financeOverview: no,
    collect: no,
    debts: no,
    revenue: no,
    ledger: no,
    payAccounts: no,
    attend: no,
    attendQr: no,
    holds: no,
    tasks: yes,
    bookings: no,
    ai: yes,
    access: no,
  },
};

function moneyRoles(role: MatrixRole) {
  return role === "owner" || role === "reception";
}

/** Mặc định tab trong trang. */
export function defaultTabsFor(role: MatrixRole): Record<TabKey, boolean> {
  const out = {} as Record<TabKey, boolean>;
  for (const def of TAB_DEFS) {
    if (def.group === "student") {
      if (def.localId === "money" || def.localId === "hold") {
        out[def.key] = moneyRoles(role);
      } else {
        out[def.key] = DEFAULT_NAV[role].students;
      }
    } else if (def.group === "room") {
      out[def.key] = DEFAULT_NAV[role].rooms;
    } else {
      out[def.key] = DEFAULT_NAV[role].courses;
    }
  }
  return out;
}

export function defaultRoleAccess(role: MatrixRole): RoleAccess {
  return {
    id: role,
    items: { ...DEFAULT_NAV[role] },
    tabs: { ...defaultTabsFor(role) },
  };
}

export function defaultAllRoleAccess(): RoleAccess[] {
  return MATRIX_ROLES.map(defaultRoleAccess);
}

export function mergeWithDefaults(row: RoleAccess | undefined, role: MatrixRole): RoleAccess {
  const base = defaultRoleAccess(role);
  if (!row) return base;
  return {
    id: role,
    items: { ...base.items, ...row.items },
    tabs: { ...base.tabs, ...row.tabs },
  };
}
