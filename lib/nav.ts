import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  LineChart,
  Link2,
  ListTodo,
  Package,
  PauseCircle,
  QrCode,
  Receipt,
  Settings2,
  Sparkles,
  Tags,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Key trong `t.nav` — thêm mục nav thì thêm key ở đây + copy.ts. */
export type NavItemKey =
  | "overview"
  | "schedule"
  | "students"
  | "courses"
  | "classes"
  | "teachers"
  | "rooms"
  | "packages"
  | "midEnroll"
  | "promotion"
  | "care"
  | "campaigns"
  | "financeOverview"
  | "collect"
  | "debts"
  | "revenue"
  | "ledger"
  | "payAccounts"
  | "attend"
  | "attendQr"
  | "holds"
  | "tasks"
  | "bookings"
  | "ai"
  | "access";

export type NavGroupKey = "manage" | "enrollGroup" | "finance" | "ops" | "system";

export type NavItem = { href: string; key: NavItemKey; icon: LucideIcon };
export type NavGroup = { title: NavGroupKey; items: NavItem[] };

/** SoT danh mục nav — dùng bởi sidebar desktop và trang /menu. */
export const NAV_TOP: NavItem[] = [
  { href: "/overview", key: "overview", icon: LayoutDashboard },
  { href: "/schedule", key: "schedule", icon: CalendarDays },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "manage",
    items: [
      { href: "/students", key: "students", icon: Users },
      { href: "/courses", key: "courses", icon: BookOpen },
      { href: "/classes", key: "classes", icon: GraduationCap },
      { href: "/teachers", key: "teachers", icon: UserRound },
      { href: "/rooms", key: "rooms", icon: DoorOpen },
      { href: "/subscriptions", key: "packages", icon: Package },
    ],
  },
  {
    title: "enrollGroup",
    items: [
      { href: "/mid-course-enroll", key: "midEnroll", icon: ClipboardCheck },
      { href: "/promotion", key: "promotion", icon: Tags },
      { href: "/follow-up", key: "care", icon: HeartHandshake },
      { href: "/campaigns", key: "campaigns", icon: Link2 },
    ],
  },
  {
    title: "finance",
    items: [
      { href: "/finance", key: "financeOverview", icon: LayoutDashboard },
      { href: "/collect-fees", key: "collect", icon: Wallet },
      { href: "/receivables", key: "debts", icon: Receipt },
      { href: "/revenue", key: "revenue", icon: LineChart },
      { href: "/collections", key: "ledger", icon: ArrowLeftRight },
      { href: "/payment-accounts", key: "payAccounts", icon: Landmark },
    ],
  },
  {
    title: "ops",
    items: [
      { href: "/attendance", key: "attend", icon: Receipt },
      { href: "/qr-attendance", key: "attendQr", icon: QrCode },
      { href: "/holds", key: "holds", icon: PauseCircle },
      { href: "/tasks", key: "tasks", icon: ListTodo },
      { href: "/room-bookings", key: "bookings", icon: DoorOpen },
    ],
  },
];

export const NAV_AI: NavItem = { href: "/dolphin-ai", key: "ai", icon: Sparkles };

export const NAV_SYSTEM: NavGroup = {
  title: "system",
  items: [{ href: "/settings/access", key: "access", icon: Settings2 }],
};

export const ZALO_FOUNDER = "https://zalo.me/0779937633";

/** Tất cả mục nav (gồm AI + hệ thống) — ma trận / guard. */
export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_TOP,
  ...NAV_GROUPS.flatMap((g) => g.items),
  NAV_AI,
  ...NAV_SYSTEM.items,
];

