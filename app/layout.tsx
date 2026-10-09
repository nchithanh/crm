import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/auth-gate";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Dolphin Edu CRM",
  description: "CRM vận hành trung tâm giáo dục — Dolphin Software",
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" }],
    shortcut: `${basePath}/favicon.ico`,
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-vertical="nhay" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("crm-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();',
          }}
        />
      </head>
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
