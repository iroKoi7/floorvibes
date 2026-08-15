import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { RequestInsert, RequestRow, RequestStatus } from "@/lib/types";

const MOCK_STORAGE_KEY = "floorvibes:mock-requests";
const MOCK_EVENT_NAME = "floorvibes:mock-requests-changed";
const MOCK_CHANNEL_NAME = "floorvibes-mock-requests";

type ChangeCallback = () => void;

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
    requested_by: request.requested_by ?? null,
    song_title: request.song_title,
    status: request.status ?? "pending",
  };

  writeMockRequests([nextRequest, ...requests]);
  return { errorMessage: null };
}

export async function getPendingRequests(djName: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("dj_name", djName)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return {
      data: data ?? [],
      errorMessage: error?.message ?? null,
    };
  }

  return {
    data: sortNewestFirst(
      readMockRequests().filter(
        (request) => request.dj_name === djName && request.status === "pending",
      ),
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

export function subscribeToRequestChanges(djName: string, onChange: ChangeCallback) {
  if (supabase) {
    const client = supabase;
    const handleChange = (payload: RealtimePostgresChangesPayload<RequestRow>) => {
      if (
        (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
        payload.new.dj_name === djName
      ) {
        onChange();
      }
    };

    const channel = client
      .channel(`requests:${djName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "requests",
          filter: `dj_name=eq.${djName}`,
        },
        handleChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `dj_name=eq.${djName}`,
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
