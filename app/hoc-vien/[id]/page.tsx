"use client";

import { useParams } from "next/navigation";
import { RouteRedirect } from "@/components/route-redirect";

export default function LegacyIdRedirect() {
  const params = useParams();
  const id = String(params?.id ?? "");
  return <RouteRedirect to={`/students/${id}`} />;
}
