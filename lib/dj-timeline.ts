import type { DjTimelineSlotRow } from "@/lib/types";

export function sortTimelineSlots(slots: DjTimelineSlotRow[]) {
  return [...slots].sort((a, b) => {
    const startDiff = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    if (startDiff !== 0) return startDiff;
    return a.sort_order - b.sort_order;
  });
}

export function getCurrentTimelineSlot(slots: DjTimelineSlotRow[], now = Date.now()) {
  return (
    slots.find((slot) => {
      const start = new Date(slot.starts_at).getTime();
      const end = new Date(slot.ends_at).getTime();
      return start <= now && now < end;
    }) ?? null
  );
}

export function getNextTimelineSlot(slots: DjTimelineSlotRow[], now = Date.now()) {
  return sortTimelineSlots(slots).find((slot) => new Date(slot.starts_at).getTime() > now) ?? null;
}
