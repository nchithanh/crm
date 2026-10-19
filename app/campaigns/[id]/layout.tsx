import type { ReactNode } from "react";
import { campaignStaticParams } from "@/lib/static-params";

export function generateStaticParams() {
  return campaignStaticParams();
}

export default function CampaignDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
