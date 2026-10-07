import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/khach-tiem-nang", destination: "/cham-soc", permanent: false },
      { source: "/goi", destination: "/goi-buoi", permanent: false },
      { source: "/cong-no", destination: "/thu-hoc-phi", permanent: false },
      { source: "/lich/:id", destination: "/lop-hoc/:id", permanent: false },
    ];
  },
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
