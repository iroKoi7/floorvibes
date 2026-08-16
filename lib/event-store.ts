import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { DjInsert, DjRow, DjUpdate, EventInsert, EventRow, EventUpdate } from "@/lib/types";

const MOCK_EVENTS_KEY = "floorvibes:mock-events";
const MOCK_DJS_KEY = "floorvibes:mock-djs";

export const DEFAULT_EVENT_SLUG = "floorvibes";

function createMockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function defaultEvents(): EventRow[] {
  return [
    {
      id: "mock-event-floorvibes",
      created_at: new Date().toISOString(),
      name: "FloorVibes Night",
      slug: DEFAULT_EVENT_SLUG,
      starts_at: null,
      ends_at: null,
      is_active: true,
    },
  ];
}

function defaultDjs(): DjRow[] {
  return ["DJ Koike", "DJ Taiyo", "Guest DJ"].map((name, index) => ({
    id: `mock-dj-${index + 1}`,
    event_id: "mock-event-floorvibes",
    created_at: new Date().toISOString(),
    name,
    is_active: true,
    sort_order: index,
  }));
}

function readMockRows<T>(key: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;

  const rawRows = window.localStorage.getItem(key);
  if (!rawRows) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(rawRows) as T[];
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeMockRows<T>(key: string, rows: T[]) {
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function readMockEvents() {
  return readMockRows(MOCK_EVENTS_KEY, defaultEvents());
}

function readMockDjs() {
  return readMockRows(MOCK_DJS_KEY, defaultDjs());
}

export async function getActiveEvents() {
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return { data: data ?? [], errorMessage: error?.message ?? null };
  }

  return {
    data: readMockEvents().filter((event) => event.is_active),
    errorMessage: null,
  };
}

export async function getAdminEvents() {
  return getActiveEvents();
}

export async function getEventBySlug(slug: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    return { data, errorMessage: error?.message ?? null };
  }

  return {
    data: readMockEvents().find((event) => event.slug === slug && event.is_active) ?? null,
    errorMessage: null,
  };
}

export async function getEventById(id: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    return { data, errorMessage: error?.message ?? null };
  }

  return {
    data: readMockEvents().find((event) => event.id === id) ?? null,
    errorMessage: null,
  };
}

export async function getDjsForEvent(eventId: string, includeInactive = false) {
  if (supabase) {
    let query = supabase
      .from("djs")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    return { data: data ?? [], errorMessage: error?.message ?? null };
  }

  return {
    data: readMockDjs()
      .filter((dj) => dj.event_id === eventId && (includeInactive || dj.is_active))
      .sort((a, b) => a.sort_order - b.sort_order),
    errorMessage: null,
  };
}

export async function createEvent(event: EventInsert) {
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .insert(event)
      .select("*")
      .single();
    return { data, errorMessage: error?.message ?? null };
  }

  const events = readMockEvents();
  const nextEvent: EventRow = {
    id: createMockId(),
    created_at: new Date().toISOString(),
    name: event.name,
    slug: event.slug,
    starts_at: event.starts_at ?? null,
    ends_at: event.ends_at ?? null,
    is_active: event.is_active ?? true,
  };
  writeMockRows(MOCK_EVENTS_KEY, [nextEvent, ...events]);
  return { data: nextEvent, errorMessage: null };
}

export async function updateEvent(id: string, event: EventUpdate) {
  if (supabase) {
    const { error } = await supabase.from("events").update(event).eq("id", id);
    return { errorMessage: error?.message ?? null };
  }

  writeMockRows(
    MOCK_EVENTS_KEY,
    readMockEvents().map((row) => (row.id === id ? { ...row, ...event } : row)),
  );
  return { errorMessage: null };
}

export async function createDj(dj: DjInsert) {
  if (supabase) {
    const { error } = await supabase.from("djs").insert(dj);
    return { errorMessage: error?.message ?? null };
  }

  const djs = readMockDjs();
  const nextDj: DjRow = {
    id: createMockId(),
    event_id: dj.event_id,
    created_at: new Date().toISOString(),
    name: dj.name,
    is_active: dj.is_active ?? true,
    sort_order: dj.sort_order ?? djs.length,
  };
  writeMockRows(MOCK_DJS_KEY, [...djs, nextDj]);
  return { errorMessage: null };
}

export async function updateDj(id: string, dj: DjUpdate) {
  if (supabase) {
    const { error } = await supabase.from("djs").update(dj).eq("id", id);
    return { errorMessage: error?.message ?? null };
  }

  writeMockRows(
    MOCK_DJS_KEY,
    readMockDjs().map((row) => (row.id === id ? { ...row, ...dj } : row)),
  );
  return { errorMessage: null };
}

export async function deleteDj(id: string) {
  if (supabase) {
    const { error } = await supabase.from("djs").delete().eq("id", id);
    return { errorMessage: error?.message ?? null };
  }

  writeMockRows(
    MOCK_DJS_KEY,
    readMockDjs().filter((row) => row.id !== id),
  );
  return { errorMessage: null };
}

export const isUsingMockEvents = !isSupabaseConfigured;
