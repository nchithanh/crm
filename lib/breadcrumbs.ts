import type { Lang } from "@/lib/copy";

type Crumb = { href?: string; label: string };

const labels: Record<Lang, Record<string, string>> = {
  vi: {
    home: "Trang chủ",
    overview: "Tổng quan",
    schedule: "Lịch",
    students: "Học viên",
    courses: "Khóa học",
    classes: "Buổi học",
    teachers: "Giáo viên",
    rooms: "Phòng",
    subscriptions: "Subscription",
    "mid-course-enroll": "Ghi danh giữa khóa",
    promotion: "Promotion",
    "follow-up": "Chăm sóc",
    finance: "Tài chính",
    "collect-fees": "Thu học phí",
    receivables: "Công nợ",
    revenue: "Doanh thu",
    collections: "Lịch sử thu",
    ledger: "Lịch sử thu",
    attendance: "Điểm danh",
    "qr-attendance": "Điểm danh QR",
    holds: "Bảo lưu",
    tasks: "Tác vụ",
    "room-bookings": "Đặt phòng",
    "dolphin-ai": "Dolphin AI",
    ai: "Dolphin AI",
    login: "Đăng nhập",
  },
  en: {
    home: "Home",
    overview: "Overview",
    schedule: "Schedule",
    students: "Students",
    courses: "Courses",
    classes: "Classes",
    teachers: "Teachers",
    rooms: "Rooms",
    subscriptions: "Subscriptions",
    "mid-course-enroll": "Mid-course enroll",
    promotion: "Promotion",
    "follow-up": "Follow-up",
    finance: "Finance",
    "collect-fees": "Collect fees",
    receivables: "Receivables",
    revenue: "Revenue",
    collections: "Collections",
    ledger: "Collections",
    attendance: "Attendance",
    "qr-attendance": "QR attendance",
    holds: "Holds",
    tasks: "Tasks",
    "room-bookings": "Room bookings",
    "dolphin-ai": "Dolphin AI",
    ai: "Dolphin AI",
    login: "Login",
  },
};

export function breadcrumbsForPath(pathname: string, lang: Lang): Crumb[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/overview" || path === "/login" || path === "/choose-vertical") return [];

  const map = labels[lang];
  const parts = path.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ href: "/overview", label: map.home }];

  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    acc += `/${part}`;
    const isLast = i === parts.length - 1;
    const known = map[part];
    const label = known ?? (part.startsWith("s-") || part.startsWith("k-") || part.startsWith("u-") || part.includes("-c")
      ? part
      : part);
    crumbs.push(isLast ? { label } : { href: acc, label });
  }
  return crumbs;
}
