import type { DjTimelineSlotRow } from "@/lib/types";

export function getCurrentTimelineSlot(slots: DjTimelineSlotRow[], now = Date.now()) {
  return (
    slots.find((slot) => {
      const start = new Date(slot.starts_at).getTime();
      const end = new Date(slot.ends_at).getTime();
      return start <= now && now < end;
    }) ?? null
  );
}
