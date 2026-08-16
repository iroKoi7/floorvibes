"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Headphones, Radio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudienceShareCard } from "@/components/audience-share-card";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/language-toggle";
import { LocalModeNotice } from "@/components/local-mode-notice";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_EVENT_SLUG,
  getActiveEvents,
  getDjsForEvent,
  getEventBySlug,
} from "@/lib/event-store";
import { isLanguage, LANGUAGE_STORAGE_KEY, text, type Language } from "@/lib/i18n";
import {
  getPendingRequests,
  isUsingMockRequests,
  subscribeToRequestChanges,
  updateRequestStatus,
} from "@/lib/request-store";
import type { DjRow, EventRow, RequestRow, RequestStatus } from "@/lib/types";

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type DjPageProps = {
  fixedEventSlug?: string;
};

export function DjPage({ fixedEventSlug }: DjPageProps = {}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [djs, setDjs] = useState<DjRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [djId, setDjId] = useState("");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const activeCount = requests.length;
  const copy = text[language];
  const selectedEvent = events.find((event) => event.id === eventId) ?? null;
  const selectedDj = djs.find((dj) => dj.id === djId) ?? null;
  const djName = selectedDj?.name ?? copy.loadingRequests;

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  useEffect(() => {
    async function loadEvents() {
      const params = new URLSearchParams(window.location.search);
      const urlEventSlug = fixedEventSlug ?? params.get("event");
      const preferredSlug = urlEventSlug || DEFAULT_EVENT_SLUG;
      const [{ data: activeEvents }, { data: urlEvent }] = await Promise.all([
        fixedEventSlug ? Promise.resolve({ data: [] }) : getActiveEvents(),
        getEventBySlug(preferredSlug),
      ]);
      const nextEvents = fixedEventSlug && urlEvent
        ? [urlEvent]
        : activeEvents.length
          ? activeEvents
          : urlEvent
            ? [urlEvent]
            : [];
      const nextEvent = urlEvent ?? nextEvents[0] ?? null;

      setEvents(nextEvents);
      if (nextEvent) setEventId(nextEvent.id);
    }

    void loadEvents();
  }, [fixedEventSlug]);

  useEffect(() => {
    if (!eventId) return;

    async function loadDjs() {
      const params = new URLSearchParams(window.location.search);
      const urlDjId = params.get("dj");
      const { data } = await getDjsForEvent(eventId);
      const nextDj = data.find((dj) => dj.id === urlDjId) ?? data[0] ?? null;

      setDjs(data);
      setDjId(nextDj?.id ?? "");
    }

    void loadDjs();
  }, [eventId]);

  const loadRequests = useCallback(async () => {
    if (!selectedDj) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, errorMessage } = await getPendingRequests({
      eventId: selectedEvent?.id ?? null,
      djId: selectedDj.id,
      djName: selectedDj.name,
    });

    if (errorMessage) {
      setErrorMessage(errorMessage);
      setRequests([]);
    } else {
      setErrorMessage(null);
      setRequests(data ?? []);
    }

    setIsLoading(false);
  }, [selectedDj, selectedEvent]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedDj) return;

    return subscribeToRequestChanges(
      {
        eventId: selectedEvent?.id ?? null,
        djId: selectedDj.id,
        djName: selectedDj.name,
      },
      () => {
        void loadRequests();
      },
    );
  }, [loadRequests, selectedDj, selectedEvent]);

  async function updateStatus(id: string, status: Exclude<RequestStatus, "pending">) {
    setRequests((current) => current.filter((request) => request.id !== id));

    const { errorMessage } = await updateRequestStatus(id, status);
    if (errorMessage) {
      setErrorMessage(errorMessage);
      await loadRequests();
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-[#080310]/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-pink-200">
              <Radio className="h-4 w-4" aria-hidden="true" />
              {copy.floorVibesLive}
            </div>
            <h1 className="mt-1 truncate text-2xl font-black text-white">{copy.djDashboard}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle language={language} onChange={handleLanguageChange} />
            <div className="w-36 sm:w-52">
              <Select
                aria-label={copy.selectActiveDj}
                value={djId}
                onChange={(event) => setDjId(event.target.value)}
              >
                {djs.map((dj) => (
                  <option key={dj.id} value={dj.id}>
                    {dj.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </header>

      <section className="py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-400">
              <Headphones className="h-4 w-4 text-cyan-200" aria-hidden="true" />
              {copy.activeRequestsFor}
            </p>
            <h2 className="text-3xl font-black text-white">{djName}</h2>
          </div>
          <div className="rounded-lg border border-pink-300/20 bg-pink-300/10 px-4 py-2 text-center shadow-[0_0_26px_rgba(236,72,153,0.14)]">
            <p className="text-2xl font-black text-pink-50">{activeCount}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
              {copy.pending}
            </p>
          </div>
        </div>

        {isUsingMockRequests ? <LocalModeNotice message={copy.localMode} /> : null}

        <div className="mt-4">
          {selectedEvent && selectedDj ? (
            <AudienceShareCard
              eventSlug={selectedEvent.slug}
              djId={selectedDj.id}
              djName={selectedDj.name}
              language={language}
            />
          ) : null}
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <Card className="p-5 text-sm font-bold text-slate-300">{copy.loadingRequests}</Card>
          ) : null}

          {!isLoading && requests.length === 0 ? (
            <Card className="p-7 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-pink-200/70" aria-hidden="true" />
              <p className="mt-3 text-lg font-black text-white">{copy.noPendingRequests}</p>
              <p className="mt-1 text-sm text-slate-400">{copy.newTracksAppear}</p>
            </Card>
          ) : null}

          {requests.map((request) => (
            <Card key={request.id} className="relative overflow-hidden p-4">
              <div
                className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,#fb5ab8,#38dfff,#a855f7)]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    <Clock3 className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                    {formatTime(request.created_at)}
                  </p>
                  <h3 className="mt-2 break-words text-xl font-black text-white">
                    {request.song_title}
                  </h3>
                  {request.requested_by ? (
                    <p className="mt-2 text-sm font-bold text-pink-100/80">
                      {copy.requestedBy}: {request.requested_by}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => void updateStatus(request.id, "played")}
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                    {copy.played}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void updateStatus(request.id, "dismissed")}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                    {copy.dismiss}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DjPage;
