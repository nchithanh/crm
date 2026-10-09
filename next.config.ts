import path from "node:path";
import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath =
  isGithubPages && process.env.GITHUB_PAGES_BASE_PATH
    ? process.env.GITHUB_PAGES_BASE_PATH
    : "";

const legacyRedirects = [
  { source: "/khoa-hoc", destination: "/courses", permanent: false },
  { source: "/khoa-hoc/:path*", destination: "/courses/:path*", permanent: false },
  { source: "/lop-hoc", destination: "/classes", permanent: false },
  { source: "/lop-hoc/:path*", destination: "/classes/:path*", permanent: false },
  { source: "/giao-vien", destination: "/teachers", permanent: false },
  { source: "/giao-vien/:path*", destination: "/teachers/:path*", permanent: false },
  { source: "/hoc-vien", destination: "/students", permanent: false },
  { source: "/hoc-vien/:path*", destination: "/students/:path*", permanent: false },
  { source: "/lich", destination: "/schedule", permanent: false },
  { source: "/lich/:path*", destination: "/schedule/:path*", permanent: false },
  { source: "/ghi-danh", destination: "/mid-course-enroll", permanent: false },
  { source: "/enroll", destination: "/mid-course-enroll", permanent: false },
  { source: "/goi-buoi", destination: "/subscriptions", permanent: false },
  { source: "/goi", destination: "/subscriptions", permanent: false },
  { source: "/plans", destination: "/subscriptions", permanent: false },
  { source: "/plans/:path*", destination: "/subscriptions/:path*", permanent: false },
  { source: "/thu-hoc-phi", destination: "/collect-fees", permanent: false },
  { source: "/cong-no", destination: "/receivables", permanent: false },
  { source: "/fees", destination: "/collect-fees", permanent: false },
  { source: "/finance/collect", destination: "/collect-fees", permanent: false },
  { source: "/finance/debts", destination: "/receivables", permanent: false },
  { source: "/finance/revenue", destination: "/revenue", permanent: false },
  { source: "/finance/ledger", destination: "/collections", permanent: false },
  { source: "/ai", destination: "/dolphin-ai", permanent: false },
  { source: "/diem-danh", destination: "/attendance", permanent: false },
  { source: "/diem-danh-qr", destination: "/qr-attendance", permanent: false },
  { source: "/dat-phong", destination: "/room-bookings", permanent: false },
  { source: "/phong", destination: "/rooms", permanent: false },
  { source: "/bao-luu", destination: "/holds", permanent: false },
  { source: "/doanh-thu", destination: "/revenue", permanent: false },
  { source: "/tac-vu", destination: "/tasks", permanent: false },
  { source: "/cham-soc", destination: "/follow-up", permanent: false },
  { source: "/khach-tiem-nang", destination: "/follow-up", permanent: false },
  { source: "/leads", destination: "/follow-up", permanent: false },
  { source: "/chon-linh-vuc", destination: "/choose-vertical", permanent: false },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isGithubPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
      }
    : {
        async redirects() {
          return legacyRedirects;
        },
      }),
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
