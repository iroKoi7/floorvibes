"use client";

import { useParams } from "next/navigation";
import { EventEditor } from "@/app/admin/_components/event-editor";

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  return <EventEditor eventId={params.eventId} mode="edit" />;
}
