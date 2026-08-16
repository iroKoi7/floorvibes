"use client";

import { useParams } from "next/navigation";
import { AdminAuthGate } from "@/app/admin/_components/admin-auth-gate";
import { EventEditor } from "@/app/admin/_components/event-editor";

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  return (
    <AdminAuthGate>
      <EventEditor eventId={params.eventId} mode="edit" />
    </AdminAuthGate>
  );
}
