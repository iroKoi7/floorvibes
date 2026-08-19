import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { DjRow, EventLikeInsert, EventLikeRow } from "@/lib/types";

const MOCK_EVENT_LIKES_KEY = "floorvibes:mock-event-likes";

export type DjLikeCount = {
  dj_id: string;
  count: number;
};

function createMockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-like-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readMockLikes() {
  if (typeof window === "undefined") return [];

  const rawRows = window.localStorage.getItem(MOCK_EVENT_LIKES_KEY);
  if (!rawRows) return [];

  try {
    return JSON.parse(rawRows) as EventLikeRow[];
  } catch {
    window.localStorage.removeItem(MOCK_EVENT_LIKES_KEY);
    return [];
  }
}

function writeMockLikes(rows: EventLikeRow[]) {
  window.localStorage.setItem(MOCK_EVENT_LIKES_KEY, JSON.stringify(rows));
}

export async function createEventLike(like: EventLikeInsert) {
  if (supabase) {
    const { error } = await supabase.from("event_likes").insert(like);
    if (error?.code === "23505") {
      return { errorMessage: "You already sent love to this DJ." };
    }

    return { errorMessage: error?.message ?? null };
  }

  const likes = readMockLikes();
  const alreadyLiked = likes.some(
    (row) =>
      row.event_id === like.event_id &&
      row.dj_id === like.dj_id &&
      row.audience_session_id === like.audience_session_id,
  );

  if (alreadyLiked) {
    return { errorMessage: "You already sent love to this DJ." };
  }

  writeMockLikes([
    ...likes,
    {
      id: createMockId(),
      created_at: new Date().toISOString(),
      event_id: like.event_id,
      dj_id: like.dj_id,
      audience_session_id: like.audience_session_id,
      audience_name: like.audience_name ?? null,
    },
  ]);

  return { errorMessage: null };
}

export async function getLikedDjIds(eventId: string, audienceSessionId: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("event_likes")
      .select("dj_id")
      .eq("event_id", eventId)
      .eq("audience_session_id", audienceSessionId);

    return {
      data: data?.map((row) => row.dj_id) ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: readMockLikes()
      .filter((row) => row.event_id === eventId && row.audience_session_id === audienceSessionId)
      .map((row) => row.dj_id),
    errorMessage: null,
  };
}

export async function getDjLikeCounts(eventId: string, djs: DjRow[]) {
  if (supabase) {
    const { data, error } = await supabase
      .from("event_likes")
      .select("dj_id")
      .eq("event_id", eventId);

    if (error) return { data: [], errorMessage: error.message };

    return {
      data: djs.map((dj) => ({
        dj_id: dj.id,
        count: data?.filter((row) => row.dj_id === dj.id).length ?? 0,
      })),
      errorMessage: null,
    };
  }

  const likes = readMockLikes().filter((row) => row.event_id === eventId);
  return {
    data: djs.map((dj) => ({
      dj_id: dj.id,
      count: likes.filter((like) => like.dj_id === dj.id).length,
    })),
    errorMessage: null,
  };
}

export const isUsingMockFeedback = !isSupabaseConfigured;
