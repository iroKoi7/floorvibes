"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock3,
  ExternalLink,
  Headphones,
  Heart,
  Music2,
  PartyPopper,
  Radio,
  Trash2,
} from "lucide-react";
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
  getAnsweredRequests,
  isUsingMockRequests,
  subscribeToRequestChanges,
  updateRequestStatus,
} from "@/lib/request-store";
import { getDjLikeCounts } from "@/lib/feedback-store";
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
  const [answeredRequests, setAnsweredRequests] = useState<RequestRow[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const activeCount = requests.length;
  const copy = text[language];
  const selectedEvent = events.find((event) => event.id === eventId) ?? null;
  const selectedDj = djs.find((dj) => dj.id === djId) ?? null;
  const isEventEnded = Boolean(
    selectedEvent?.ends_at && new Date(selectedEvent.ends_at).getTime() <= currentTime,
  );
  const djName = selectedDj?.name ?? copy.loadingRequests;

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30 * 1000);
    return () => window.clearInterval(interval);
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

  useEffect(() => {
    if (!eventId || djs.length === 0) return;

    async function loadLikes() {
      const { data } = await getDjLikeCounts(eventId, djs);
      setLikeCounts(Object.fromEntries(data.map((row) => [row.dj_id, row.count])));
    }

    void loadLikes();
  }, [djs, eventId]);

  const loadRequests = useCallback(async () => {
    if (!selectedDj || isEventEnded) {
      setRequests([]);
      setAnsweredRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [pendingResult, answeredResult] = await Promise.all([
      getPendingRequests({
        eventId: selectedEvent?.id ?? null,
        djId: selectedDj.id,
        djName: selectedDj.name,
      }),
      getAnsweredRequests({
        eventId: selectedEvent?.id ?? null,
        djId: selectedDj.id,
        djName: selectedDj.name,
      }),
    ]);

    const errorMessage = pendingResult.errorMessage ?? answeredResult.errorMessage;

    if (errorMessage) {
      setErrorMessage(errorMessage);
      setRequests([]);
      setAnsweredRequests([]);
    } else {
      setErrorMessage(null);
      setRequests(pendingResult.data ?? []);
      setAnsweredRequests(answeredResult.data ?? []);
    }

    setIsLoading(false);
  }, [isEventEnded, selectedDj, selectedEvent]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedDj || isEventEnded) return;

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
  }, [isEventEnded, loadRequests, selectedDj, selectedEvent]);

  async function updateStatus(id: string, status: Exclude<RequestStatus, "pending">) {
    setRequests((current) => current.filter((request) => request.id !== id));

    const { errorMessage } = await updateRequestStatus(id, status);
    if (errorMessage) {
      setErrorMessage(errorMessage);
      await loadRequests();
    } else {
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

        {isEventEnded && selectedEvent ? (
          <Card className="mt-5 p-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-pink-300/25 bg-pink-300/10 text-pink-100">
              <PartyPopper className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
              {language === "ja" ? "イベント終了" : "Event ended"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">{selectedEvent.name}</h2>
            <p className="mt-3 whitespace-pre-line text-sm font-bold leading-6 text-slate-300">
              {selectedEvent.end_message}
            </p>
            {selectedEvent.end_cta_label && selectedEvent.end_cta_url ? (
              <a
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-200/16"
                href={selectedEvent.end_cta_url}
                rel="noreferrer"
                target="_blank"
              >
                {selectedEvent.end_cta_label}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {djs.map((dj) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-left"
                  key={dj.id}
                >
                  <p className="truncate text-sm font-black text-white">{dj.name}</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-black text-pink-100">
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    {likeCounts[dj.id] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {!isEventEnded && errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {!isEventEnded ? (
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
                <div className="flex min-w-0 gap-3">
                  {request.song_artwork_url ? (
                    <a
                      className="mt-1 h-16 w-16 shrink-0 overflow-hidden rounded-lg shadow-[0_0_22px_rgba(56,223,255,0.12)] transition hover:scale-[1.02]"
                      href={request.song_url ?? undefined}
                      rel="noreferrer"
                      target={request.song_url ? "_blank" : undefined}
                    >
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={request.song_artwork_url}
                      />
                    </a>
                  ) : (
                    <div className="mt-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-cyan-200/15 bg-cyan-200/10 text-cyan-100">
                      <Music2 className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      <Clock3 className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                      {formatTime(request.created_at)}
                    </p>
                    <h3 className="mt-2 break-words text-xl font-black text-white">
                      {request.song_title}
                    </h3>
                    {request.song_artist ? (
                      <p className="mt-1 truncate text-sm font-bold text-cyan-100/80">
                        {request.song_artist}
                      </p>
                    ) : null}
                    {request.requested_by ? (
                      <p className="mt-2 text-sm font-bold text-pink-100/80">
                        {copy.requestedBy}: {request.requested_by}
                      </p>
                    ) : null}
                  </div>
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

          {!isLoading && answeredRequests.length > 0 ? (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {language === "ja" ? "対応済み" : "Answered"}
                  </p>
                  <h3 className="text-lg font-black text-white">
                    {language === "ja" ? "対応済みリクエスト" : "Handled requests"}
                  </h3>
                </div>
                <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                  {answeredRequests.length}
                </p>
              </div>
              <div className="space-y-2">
                {answeredRequests.slice(0, 8).map((request) => {
                  const played = request.status === "played";
                  return (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"
                      key={request.id}
                    >
                      {request.song_artwork_url ? (
                        <img
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-md object-cover"
                          src={request.song_artwork_url}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-200/15 bg-cyan-200/10 text-cyan-100">
                          <Music2 className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{request.song_title}</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                          {request.song_artist ?? request.requested_by ?? formatTime(request.created_at)}
                        </p>
                      </div>
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[11px] font-black",
                          played
                            ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                            : "border-slate-500/25 bg-slate-500/10 text-slate-300",
                        ].join(" ")}
                      >
                        {played ? copy.played : copy.dismiss}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
        ) : null}
      </section>
    </main>
  );
}

export default DjPage;
