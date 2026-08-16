"use client";

import { useParams } from "next/navigation";
import { DjPage } from "@/app/dj/page";

export default function EventDjPage() {
  const params = useParams<{ slug: string }>();
  return <DjPage fixedEventSlug={params.slug} />;
}
