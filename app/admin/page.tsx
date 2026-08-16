"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminAuthGate } from "@/app/admin/_components/admin-auth-gate";
import { AdminSignOutButton } from "@/app/admin/_components/admin-sign-out-button";
import { getAdminEvents } from "@/lib/event-store";
import type { EventRow } from "@/lib/types";

type Feedback = {
  type: "success" | "error";
  message: string;
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

export default function AdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      const { data, errorMessage } = await getAdminEvents();
      if (errorMessage) {
        setFeedback({ type: "error", message: errorMessage });
      } else {
        setEvents(data);
      }
      setIsLoading(false);
    }

    void loadEvents();
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

          return (
            <details className="group border-b border-white/10 last:border-b-0" key={event.id}>
              <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[1fr_180px_auto] sm:items-center [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{event.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">/{event.slug}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{formatDate(event.starts_at)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatSchedule(event)}</p>
                </div>
                <ChevronDown
                  className="h-5 w-5 justify-self-end text-pink-200 transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="space-y-4 border-t border-white/10 bg-[#0b0614]/60 px-4 py-4">
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
