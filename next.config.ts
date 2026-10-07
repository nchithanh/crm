import path from "node:path";
import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath =
  isGithubPages && process.env.GITHUB_PAGES_BASE_PATH
    ? process.env.GITHUB_PAGES_BASE_PATH
    : "";

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
          return [
            { source: "/khach-tiem-nang", destination: "/cham-soc", permanent: false },
            { source: "/goi", destination: "/goi-buoi", permanent: false },
            { source: "/cong-no", destination: "/thu-hoc-phi", permanent: false },
            { source: "/lich/:id", destination: "/lop-hoc/:id", permanent: false },
          ];
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
