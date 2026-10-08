"use client";

import { useParams } from "next/navigation";
import { ClientRedirect } from "@/components/client-redirect";

export default function OldClassRedirect() {
  const { id } = useParams<{ id: string }>();
  return <ClientRedirect href={`/classes/${id}`} />;
}
