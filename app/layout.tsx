import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/auth-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dolphin CRM",
  description: "CRM cho trung tâm dạy nhảy — Dolphin Software",
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-vertical="nhay">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
