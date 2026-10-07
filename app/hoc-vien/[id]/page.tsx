"use client";

import { useParams } from "next/navigation";
import { ClientRedirect } from "@/components/client-redirect";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  return <ClientRedirect href={`/hoc-vien?student=${id}`} />;
}
