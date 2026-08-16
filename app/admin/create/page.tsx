import { AdminAuthGate } from "@/app/admin/_components/admin-auth-gate";
import { EventEditor } from "@/app/admin/_components/event-editor";

export default function CreateEventPage() {
  return (
    <AdminAuthGate>
      <EventEditor mode="create" />
    </AdminAuthGate>
  );
}
