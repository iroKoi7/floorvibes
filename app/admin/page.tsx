"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Copy,
  ExternalLink,
  Heart,
  ListMusic,
  Pencil,
  Plus,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { AdminAuthGate } from "@/app/admin/_components/admin-auth-gate";
import { AdminSignOutButton } from "@/app/admin/_components/admin-sign-out-button";
import { getAdminEvents, getDjsForEvent } from "@/lib/event-store";
import { getDjLikeCounts } from "@/lib/feedback-store";
import { getEventRequests } from "@/lib/request-store";
import type { DjRow, EventLikeMode, EventRow, RequestRow } from "@/lib/types";

type Feedback = {
  type: "success" | "error";
  message: string;
};

type EventStatus = "upcoming" | "live" | "ended" | "unscheduled";

type EventDetails = {
  djs: DjRow[];
  likeCounts: Record<string, number>;
  requests: RequestRow[];
  errorMessage: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatSchedule(event: EventRow) {
  if (!event.starts_at && !event.ends_at) return "No schedule";

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const start = event.starts_at ? timeFormatter.format(new Date(event.starts_at)) : "";
  const end = event.ends_at ? timeFormatter.format(new Date(event.ends_at)) : "";
  return [start, end].filter(Boolean).join(" - ");
}

function getEventStatus(event: EventRow, now: number): EventStatus {
  const start = event.starts_at ? new Date(event.starts_at).getTime() : null;
  const end = event.ends_at ? new Date(event.ends_at).getTime() : null;

  if (!start && !end) return "unscheduled";
  if (end && end <= now) return "ended";
  if (start && start > now) return "upcoming";
  return "live";
}

const statusConfig: Record<
  EventStatus,
  {
    label: string;
    icon: typeof Activity;
    className: string;
    rowClassName: string;
  }
> = {
  live: {
    label: "Live",
    icon: Activity,
    className: "border-pink-300/30 bg-pink-300/12 text-pink-50",
    rowClassName: "bg-pink-300/[0.035]",
  },
  upcoming: {
    label: "Upcoming",
    icon: CalendarClock,
    className: "border-cyan-300/30 bg-cyan-300/12 text-cyan-50",
    rowClassName: "",
  },
  ended: {
    label: "Ended",
    icon: CheckCircle2,
    className: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    rowClassName: "opacity-60 grayscale",
  },
  unscheduled: {
    label: "Unscheduled",
    icon: CircleDot,
    className: "border-purple-300/25 bg-purple-300/10 text-purple-100",
    rowClassName: "",
  },
};

function formatLikeMode(value: EventLikeMode) {
  return value === "single" ? "One DJ only" : "Multiple DJs";
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventDetails, setEventDetails] = useState<Record<string, EventDetails>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      const { data, errorMessage } = await getAdminEvents();
      if (errorMessage) {
        setFeedback({ type: "error", message: errorMessage });
      } else {
        setEvents(data);
        const detailPairs = await Promise.all(
          data.map(async (event) => {
            const { data: djs, errorMessage: djsError } = await getDjsForEvent(event.id);
            if (djsError) {
              return [
                event.id,
                {
                  djs: [],
                  likeCounts: {},
                  requests: [],
                  errorMessage: djsError,
                },
              ] as const;
            }

            const [
              { data: likeCounts, errorMessage: likesError },
              { data: requests, errorMessage: requestsError },
            ] = await Promise.all([
              getDjLikeCounts(event.id, djs),
              getEventRequests(event.id),
            ]);
            return [
              event.id,
              {
                djs,
                likeCounts: Object.fromEntries(likeCounts.map((row) => [row.dj_id, row.count])),
                requests,
                errorMessage: likesError ?? requestsError,
              },
            ] as const;
          }),
        );
        setEventDetails(Object.fromEntries(detailPairs));
      }
      setIsLoading(false);
    }

    void loadEvents();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function copyLink(url: string, label: string) {
    await navigator.clipboard.writeText(url);
    setFeedback({ type: "success", message: `${label} link copied.` });
  }

  return (
    <AdminAuthGate>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-pink-200">
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            FloorVibes Admin
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Events</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSignOutButton />
          <Link href="/admin/create">
            <Button type="button">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Add Event
            </Button>
          </Link>
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-5 text-sm font-bold text-slate-300">Loading events...</div>
        ) : null}

        {!isLoading && events.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-pink-200/70" aria-hidden="true" />
            <p className="mt-3 text-lg font-black text-white">No events yet</p>
            <p className="mt-1 text-sm text-slate-400">Create your first event to start sharing links.</p>
          </div>
        ) : null}

        {events.map((event) => {
          const audienceUrl = `${origin}/e/${encodeURIComponent(event.slug)}`;
          const djUrl = `${origin}/dj/${encodeURIComponent(event.slug)}`;
          const status = getEventStatus(event, currentTime);
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const details = eventDetails[event.id];
          const totalLikes = details?.djs.reduce(
            (sum, dj) => sum + (details.likeCounts[dj.id] ?? 0),
            0,
          ) ?? 0;
          const requests = details?.requests ?? [];
          const requestCounts = {
            total: requests.length,
            pending: requests.filter((request) => request.status === "pending").length,
            played: requests.filter((request) => request.status === "played").length,
            dismissed: requests.filter((request) => request.status === "dismissed").length,
          };

          return (
            <details className="group border-b border-white/10 last:border-b-0" key={event.id}>
              <summary
                className={[
                  "grid cursor-pointer list-none gap-3 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[1fr_180px_120px_auto] sm:items-center [&::-webkit-details-marker]:hidden",
                  config.rowClassName,
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{event.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">/{event.slug}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{formatDate(event.starts_at)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatSchedule(event)}</p>
                </div>
                <div
                  className={[
                    "inline-flex min-h-8 w-fit items-center gap-2 rounded-full border px-3 text-xs font-black",
                    config.className,
                  ].join(" ")}
                >
                  <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {config.label}
                </div>
                <ChevronDown
                  className="h-5 w-5 justify-self-end text-pink-200 transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="space-y-4 border-t border-white/10 bg-[#0b0614]/60 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-black text-white">
                      <StatusIcon className="h-4 w-4 text-pink-200" aria-hidden="true" />
                      {config.label}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Like mode
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatLikeMode(event.like_mode)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Total likes
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-black text-white">
                      <Heart className="h-4 w-4 text-pink-200" aria-hidden="true" />
                      {totalLikes}
                    </p>
                  </div>
                </div>

                {status === "ended" ? (
                  <div className="rounded-lg border border-pink-300/15 bg-pink-300/[0.08] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-100">
                      DJ like results
                    </p>
                    {details?.errorMessage ? (
                      <p className="mt-2 text-sm font-bold text-rose-100">{details.errorMessage}</p>
                    ) : null}
                    {!details ? (
                      <p className="mt-2 text-sm font-bold text-slate-400">Loading results...</p>
                    ) : null}
                    {details && details.djs.length === 0 ? (
                      <p className="mt-2 text-sm font-bold text-slate-400">No DJs for this event.</p>
                    ) : null}
                    {details && details.djs.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {details.djs
                          .map((dj) => ({
                            dj,
                            count: details.likeCounts[dj.id] ?? 0,
                          }))
                          .sort((a, b) => b.count - a.count)
                          .map(({ dj, count }, index) => (
                            <div
                              className="rounded-lg border border-white/10 bg-[#12091f]/70 p-3"
                              key={dj.id}
                            >
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                #{index + 1}
                              </p>
                              <p className="mt-1 truncate text-sm font-black text-white">{dj.name}</p>
                              <p className="mt-2 flex items-center gap-2 text-lg font-black text-pink-100">
                                <Heart className="h-4 w-4" aria-hidden="true" />
                                {count}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100">
                        <ListMusic className="h-4 w-4" aria-hidden="true" />
                        Request report
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-300">
                        All requests across DJs for this event.
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        ["Total", requestCounts.total],
                        ["Played!", requestCounts.played],
                        ["Waiting...", requestCounts.pending],
                        ["Dismissed", requestCounts.dismissed],
                      ].map(([label, count]) => (
                        <div className="rounded-lg border border-white/10 bg-[#12091f]/70 px-2 py-2" key={label}>
                          <p className="text-base font-black text-white">{count}</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!details ? (
                    <p className="mt-3 text-sm font-bold text-slate-400">Loading requests...</p>
                  ) : null}
                  {details && requests.length === 0 ? (
                    <p className="mt-3 text-sm font-bold text-slate-400">No requests yet.</p>
                  ) : null}
                  {details && requests.length > 0 ? (
                    <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-white/10">
                      {requests.slice(0, 60).map((request) => (
                        <div
                          className="grid gap-2 border-b border-white/10 bg-[#080310]/55 px-3 py-3 last:border-b-0 sm:grid-cols-[1.2fr_120px_120px_110px_100px] sm:items-center"
                          key={request.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {request.song_title}
                            </p>
                            {request.song_artist ? (
                              <p className="mt-0.5 truncate text-xs font-bold text-cyan-100/75">
                                {request.song_artist}
                              </p>
                            ) : null}
                          </div>
                          <p className="truncate text-xs font-bold text-pink-100/85">
                            {request.dj_name}
                          </p>
                          <p className="truncate text-xs font-bold text-slate-400">
                            {request.requested_by ?? "Anonymous"}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            {formatDate(request.created_at)}
                          </p>
                          <RequestStatusBadge compact status={request.status} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-100">
                      Audience link
                    </p>
                    <p className="mt-2 break-all text-xs font-bold text-slate-300">{audienceUrl}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        className="min-h-10 px-3 py-2 text-xs"
                        onClick={() => void copyLink(audienceUrl, "Audience")}
                        type="button"
                        variant="ghost"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy
                      </Button>
                      <a
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                        href={audienceUrl}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Open
                      </a>
                    </div>
                  </div>

                  <div className="rounded-lg border border-pink-300/20 bg-pink-300/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-100">
                      DJ link
                    </p>
                    <p className="mt-2 break-all text-xs font-bold text-slate-300">{djUrl}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        className="min-h-10 px-3 py-2 text-xs"
                        onClick={() => void copyLink(djUrl, "DJ")}
                        type="button"
                        variant="ghost"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy
                      </Button>
                      <a
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                        href={djUrl}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Open
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-bold text-cyan-50 transition hover:bg-cyan-200/16"
                    href={`/admin/edit/${event.id}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit event
                  </Link>
                </div>
              </div>
            </details>
          );
        })}
      </Card>

      {feedback ? (
        <div
          className={[
            "fixed bottom-5 left-4 right-4 z-10 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-lg border px-4 py-3 text-center text-sm font-bold shadow-2xl",
            feedback.type === "success"
              ? "border-cyan-300/30 bg-[#071319]/95 text-cyan-50 shadow-cyan-950/20"
              : "border-pink-300/30 bg-[#100719]/95 text-pink-50 shadow-pink-950/30",
          ].join(" ")}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {feedback.message}
        </div>
      ) : null}
      </main>
    </AdminAuthGate>
  );
}
