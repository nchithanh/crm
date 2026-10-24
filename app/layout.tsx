import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/auth-gate";
import { BuildUpdateGuard } from "@/components/build-update-guard";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Dolphin Edu CRM",
  description: "CRM vận hành trung tâm giáo dục — Dolphin Software",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" }],
    shortcut: `${basePath}/favicon.ico`,
  },
  appleWebApp: {
    capable: true,
    title: "Dolphin CRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#5d5cc4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <BuildUpdateGuard />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
