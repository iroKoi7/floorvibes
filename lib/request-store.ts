import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { RequestInsert, RequestRow, RequestStatus } from "@/lib/types";

const MOCK_STORAGE_KEY = "floorvibes:mock-requests";
const MOCK_EVENT_NAME = "floorvibes:mock-requests-changed";
const MOCK_CHANNEL_NAME = "floorvibes-mock-requests";

type ChangeCallback = () => void;
type RequestScope = {
  eventId?: string | null;
  djId?: string | null;
  djName?: string;
  audienceSessionId?: string | null;
};

function createMockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readMockRequests(): RequestRow[] {
  if (typeof window === "undefined") return [];

  const rawRequests = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (!rawRequests) return [];

  try {
    return JSON.parse(rawRequests) as RequestRow[];
  } catch {
    return [];
  }
}

function writeMockRequests(requests: RequestRow[]) {
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(MOCK_EVENT_NAME));

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(MOCK_CHANNEL_NAME);
    channel.postMessage({ type: "changed" });
    channel.close();
  }
}

function sortNewestFirst(requests: RequestRow[]) {
  return [...requests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function createRequest(request: RequestInsert) {
  if (supabase) {
    const { error } = await supabase.from("requests").insert(request);
    return { errorMessage: error?.message ?? null };
  }

  const requests = readMockRequests();
  const nextRequest: RequestRow = {
    id: createMockId(),
    created_at: new Date().toISOString(),
    dj_name: request.dj_name,
    event_id: request.event_id ?? null,
    dj_id: request.dj_id ?? null,
    audience_session_id: request.audience_session_id ?? null,
    requested_by: request.requested_by ?? null,
    song_title: request.song_title,
    song_artist: request.song_artist ?? null,
    song_artwork_url: request.song_artwork_url ?? null,
    song_provider: request.song_provider ?? null,
    song_provider_id: request.song_provider_id ?? null,
    song_url: request.song_url ?? null,
    status: request.status ?? "pending",
  };

  writeMockRequests([nextRequest, ...requests]);
  return { errorMessage: null };
}

function matchesRequestScope(request: RequestRow, scope: RequestScope) {
  if (scope.eventId && request.event_id !== scope.eventId) return false;
  if (scope.audienceSessionId) return request.audience_session_id === scope.audienceSessionId;
  if (scope.djId) return request.dj_id === scope.djId;
  if (scope.djName) return request.dj_name === scope.djName;
  return true;
}

export async function getPendingRequests(scope: RequestScope) {
  if (supabase) {
    let query = supabase
      .from("requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (scope.eventId) query = query.eq("event_id", scope.eventId);

    if (scope.djId) {
      query = query.eq("dj_id", scope.djId);
    } else if (scope.djName) {
      query = query.eq("dj_name", scope.djName);
    }

    const { data, error } = await query;

    return {
      data: data ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: sortNewestFirst(
      readMockRequests().filter(
        (request) => matchesRequestScope(request, scope) && request.status === "pending",
      ),
    ),
    errorMessage: null,
  };
}

export async function getAnsweredRequests(scope: RequestScope) {
  if (supabase) {
    let query = supabase
      .from("requests")
      .select("*")
      .in("status", ["played", "dismissed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (scope.eventId) query = query.eq("event_id", scope.eventId);
    if (scope.djId) {
      query = query.eq("dj_id", scope.djId);
    } else if (scope.djName) {
      query = query.eq("dj_name", scope.djName);
    }

    const { data, error } = await query;

    return {
      data: data ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: sortNewestFirst(
      readMockRequests().filter(
        (request) =>
          matchesRequestScope(request, scope) &&
          (request.status === "played" || request.status === "dismissed"),
      ),
    ).slice(0, 50),
    errorMessage: null,
  };
}

export async function getAudienceRequests(eventId: string, audienceSessionId: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("event_id", eventId)
      .eq("audience_session_id", audienceSessionId)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      data: data ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: sortNewestFirst(
      readMockRequests().filter(
        (request) =>
          request.event_id === eventId && request.audience_session_id === audienceSessionId,
      ),
    ).slice(0, 20),
    errorMessage: null,
  };
}

export async function getEventRequests(eventId: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200);

    return {
      data: data ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: sortNewestFirst(readMockRequests().filter((request) => request.event_id === eventId)).slice(
      0,
      200,
    ),
    errorMessage: null,
  };
}

export async function updateRequestStatus(
  id: string,
  status: Exclude<RequestStatus, "pending">,
) {
  if (supabase) {
    const { error } = await supabase.from("requests").update({ status }).eq("id", id);
    return { errorMessage: error?.message ?? null };
  }

  writeMockRequests(
    readMockRequests().map((request) =>
      request.id === id ? { ...request, status } : request,
    ),
  );

  return { errorMessage: null };
}

export function subscribeToRequestChanges(scope: RequestScope, onChange: ChangeCallback) {
  if (supabase) {
    const client = supabase;
    const handleChange = (payload: RealtimePostgresChangesPayload<RequestRow>) => {
      if (
        (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
        matchesRequestScope(payload.new, scope)
      ) {
        onChange();
      }
    };

    const channel = client
      .channel(
        `requests:${scope.eventId ?? "all"}:${scope.djId ?? scope.djName ?? "all"}:${scope.audienceSessionId ?? "all"}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "requests",
        },
        handleChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
        },
        handleChange,
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }

  const handleStorageChange = () => onChange();
  const channel =
    typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(MOCK_CHANNEL_NAME)
      : null;

  window.addEventListener(MOCK_EVENT_NAME, handleStorageChange);
  channel?.addEventListener("message", handleStorageChange);

  return () => {
    window.removeEventListener(MOCK_EVENT_NAME, handleStorageChange);
    channel?.removeEventListener("message", handleStorageChange);
    channel?.close();
  };
}

export const isUsingMockRequests = !isSupabaseConfigured;
