"use client";

import { useParams } from "next/navigation";
import { AudiencePage } from "@/app/page";

export default function EventAudiencePage() {
  const params = useParams<{ slug: string }>();
  return <AudiencePage fixedEventSlug={params.slug} />;
}
