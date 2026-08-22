"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AudioWaveform,
  CalendarClock,
  Clock3,
  ExternalLink,
  Heart,
  Music2,
  PartyPopper,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLockup } from "@/components/brand-lockup";
import { LanguageToggle } from "@/components/language-toggle";
import { LocalModeNotice } from "@/components/local-mode-notice";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_EVENT_SLUG,
  getActiveEvents,
  getDjsForEvent,
  getEventBySlug,
  getTimelineSlotsForEvent,
} from "@/lib/event-store";
import { createEventLike, getLikedDjIds } from "@/lib/feedback-store";
import { isLanguage, LANGUAGE_STORAGE_KEY, text, type Language } from "@/lib/i18n";
import {
  createRequest,
  getAudienceRequests,
  getSongRequestSignals,
  isUsingMockRequests,
  type SongRequestSignal,
  subscribeToRequestChanges,
} from "@/lib/request-store";
import { formatSongRequestTitle, type SongSearchResult } from "@/lib/song-search";
import {
  getCurrentTimelineSlot,
  getNextTimelineSlot,
  sortTimelineSlots,
} from "@/lib/dj-timeline";
import type { DjRow, DjTimelineSlotRow, EventRow, RequestRow } from "@/lib/types";

const AUDIENCE_EVENT_STORAGE_KEY = "floorvibes:audience-event";
const AUDIENCE_DJ_STORAGE_KEY = "floorvibes:audience-dj-id";
const AUDIENCE_SESSION_STORAGE_KEY = "floorvibes:audience-session";
const REQUEST_COOLDOWN_STORAGE_KEY = "floorvibes:last-request-at";
const REQUEST_COOLDOWN_MS = 60 * 1000;
const AUDIENCE_SESSION_MS = 3 * 60 * 60 * 1000;
const SONG_SEARCH_MIN_CHARS = 3;
const SONG_SEARCH_DEBOUNCE_MS = 600;

type AudienceSession = {
  id: string;
  name: string;
  expiresAt: number;
};

type AudiencePageProps = {
  fixedEventSlug?: string;
  demoMode?: boolean;
};

const DEMO_EVENT_ID = "demo-event-floorvibes";
const DEMO_DJS: DjRow[] = [
  {
    id: "demo-dj-koike",
    event_id: DEMO_EVENT_ID,
    created_at: new Date(0).toISOString(),
    name: "DJ Koike",
    is_active: true,
    sort_order: 0,
  },
  {
    id: "demo-dj-taiyo",
    event_id: DEMO_EVENT_ID,
    created_at: new Date(0).toISOString(),
    name: "DJ Taiyo",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "demo-dj-guest",
    event_id: DEMO_EVENT_ID,
    created_at: new Date(0).toISOString(),
    name: "Guest DJ",
    is_active: true,
    sort_order: 2,
  },
];

function createDemoEvent(now = Date.now()): EventRow {
  return {
    id: DEMO_EVENT_ID,
    created_at: new Date(now).toISOString(),
    owner_id: null,
    name: "FloorVibes Demo Night",
    slug: "demo",
    starts_at: new Date(now - 60 * 60 * 1000).toISOString(),
    ends_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    end_message: "Thanks for joining FloorVibes.",
    end_cta_label: null,
    end_cta_url: null,
    like_mode: "multiple",
    is_active: true,
  };
}

function createDemoTimelineSlots(now = Date.now()): DjTimelineSlotRow[] {
  return [
    {
      id: "demo-timeline-current",
      event_id: DEMO_EVENT_ID,
      dj_id: DEMO_DJS[0].id,
      created_at: new Date(now).toISOString(),
      starts_at: new Date(now - 30 * 60 * 1000).toISOString(),
      ends_at: new Date(now + 30 * 60 * 1000).toISOString(),
      sort_order: 0,
    },
    {
      id: "demo-timeline-next",
      event_id: DEMO_EVENT_ID,
      dj_id: DEMO_DJS[1].id,
      created_at: new Date(now).toISOString(),
      starts_at: new Date(now + 30 * 60 * 1000).toISOString(),
      ends_at: new Date(now + 90 * 60 * 1000).toISOString(),
      sort_order: 1,
    },
  ];
}

function formatRequestTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimelineRange(slot: DjTimelineSlotRow) {
  return `${formatRequestTime(slot.starts_at)} - ${formatRequestTime(slot.ends_at)}`;
}

export function AudiencePage({ fixedEventSlug, demoMode = false }: AudiencePageProps = {}) {
  const [songTitle, setSongTitle] = useState("");
  const [audienceName, setAudienceName] = useState("");
  const [audienceSessionId, setAudienceSessionId] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [djs, setDjs] = useState<DjRow[]>([]);
  const [timelineSlots, setTimelineSlots] = useState<DjTimelineSlotRow[]>([]);
  const [likedDjIds, setLikedDjIds] = useState<string[]>([]);
  const [eventId, setEventId] = useState("");
  const [djId, setDjId] = useState("");
  const [hasManualDjOverride, setHasManualDjOverride] = useState(false);
  const [eventSlug, setEventSlug] = useState(DEFAULT_EVENT_SLUG);
  const [language, setLanguage] = useState<Language>("en");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [songResults, setSongResults] = useState<SongSearchResult[]>([]);
  const [songSignals, setSongSignals] = useState<Record<string, SongRequestSignal>>({});
  const [audienceRequests, setAudienceRequests] = useState<RequestRow[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [songSearchError, setSongSearchError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const copy = text[language];
  const isCoolingDown = cooldownRemaining > 0;
  const selectedEvent = events.find((event) => event.id === eventId) ?? null;
  const selectedDj = djs.find((dj) => dj.id === djId) ?? null;
  const currentTimelineSlot = getCurrentTimelineSlot(timelineSlots, currentTime);
  const nextTimelineSlot = getNextTimelineSlot(timelineSlots, currentTime);
  const sortedTimelineSlots = sortTimelineSlots(timelineSlots);
  const currentTurnDj = djs.find((dj) => dj.id === currentTimelineSlot?.dj_id) ?? null;
  const nextTurnDj = djs.find((dj) => dj.id === nextTimelineSlot?.dj_id) ?? null;
  const isEventEnded = Boolean(
    selectedEvent?.ends_at && new Date(selectedEvent.ends_at).getTime() <= currentTime,
  );
  const djName = currentTurnDj?.name ?? selectedDj?.name ?? copy.loadingRequests;

  function createAudienceSession(name = "") {
    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `audience-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      expiresAt: Date.now() + AUDIENCE_SESSION_MS,
    } satisfies AudienceSession;
  }

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
    }

    const rawSession = window.localStorage.getItem(AUDIENCE_SESSION_STORAGE_KEY);
    if (!rawSession) {
      const nextSession = createAudienceSession();
      setAudienceSessionId(nextSession.id);
      window.localStorage.setItem(AUDIENCE_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }

    try {
      const session = JSON.parse(rawSession) as AudienceSession;
      if (session.expiresAt > Date.now() && session.id) {
        setAudienceName(session.name);
        setAudienceSessionId(session.id);
      } else {
        const nextSession = createAudienceSession();
        setAudienceSessionId(nextSession.id);
        window.localStorage.setItem(AUDIENCE_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      }
    } catch {
      const nextSession = createAudienceSession();
      setAudienceSessionId(nextSession.id);
      window.localStorage.setItem(AUDIENCE_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const query = songTitle.trim();
    if (
      query.length < SONG_SEARCH_MIN_CHARS ||
      query === (selectedSong ? formatSongRequestTitle(selectedSong) : "")
    ) {
      setSongResults([]);
      setIsSearchingSongs(false);
      setSongSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearchingSongs(true);
      setSongSearchError(null);

      try {
        const response = await fetch(`/api/song-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          results?: SongSearchResult[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Song search failed.");
        }

        setSongResults(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSongResults([]);
        setSongSearchError(
          language === "ja"
            ? "候補を取得できませんでした。手入力で送信できます。"
            : "Could not load suggestions. You can still send manually.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingSongs(false);
        }
      }
    }, SONG_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [language, selectedSong, songTitle]);

  useEffect(() => {
    async function loadEvents() {
      if (demoMode) {
        const demoEvent = createDemoEvent();
        setEvents([demoEvent]);
        setEventId(demoEvent.id);
        setEventSlug(demoEvent.slug);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const urlEventSlug = fixedEventSlug ?? params.get("event");
      const savedEventSlug = window.localStorage.getItem(AUDIENCE_EVENT_STORAGE_KEY);
      const preferredSlug = urlEventSlug || savedEventSlug || DEFAULT_EVENT_SLUG;

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

      if (nextEvent) {
        setEventId(nextEvent.id);
        setEventSlug(nextEvent.slug);
        window.localStorage.setItem(AUDIENCE_EVENT_STORAGE_KEY, nextEvent.slug);
      }
    }

    void loadEvents();
  }, [demoMode, fixedEventSlug]);

  useEffect(() => {
    if (!eventId) return;

    async function loadDjs() {
      if (demoMode) {
        setDjs(DEMO_DJS);
        setDjId(DEMO_DJS[0].id);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const urlDjId = params.get("dj");
      const savedDjId = window.localStorage.getItem(AUDIENCE_DJ_STORAGE_KEY);
      const { data } = await getDjsForEvent(eventId);
      const nextDj = data.find((dj) => dj.id === urlDjId) ?? data.find((dj) => dj.id === savedDjId) ?? data[0] ?? null;

      setDjs(data);
      if (nextDj) {
        setDjId(nextDj.id);
        window.localStorage.setItem(AUDIENCE_DJ_STORAGE_KEY, nextDj.id);
      }
    }

    void loadDjs();
  }, [demoMode, eventId]);

  useEffect(() => {
    if (!eventId) return;

    async function loadTimeline() {
      if (demoMode) {
        setTimelineSlots(createDemoTimelineSlots());
        return;
      }

      const { data } = await getTimelineSlotsForEvent(eventId);
      setTimelineSlots(data);
    }

    void loadTimeline();
  }, [demoMode, eventId]);

  useEffect(() => {
    if (!currentTurnDj || hasManualDjOverride) return;
    setDjId(currentTurnDj.id);
    window.localStorage.setItem(AUDIENCE_DJ_STORAGE_KEY, currentTurnDj.id);
  }, [currentTurnDj, hasManualDjOverride]);

  useEffect(() => {
    if (demoMode) return;
    if (!eventId || djs.length === 0 || !audienceSessionId) return;

    async function loadLikes() {
      const { data: likedIds } = await getLikedDjIds(eventId, audienceSessionId);
      setLikedDjIds(likedIds);
    }

    void loadLikes();
  }, [audienceSessionId, demoMode, djs, eventId]);

  useEffect(() => {
    if (demoMode) return;
    if (!eventId || !audienceSessionId) return;

    async function loadAudienceRequests() {
      const { data } = await getAudienceRequests(eventId, audienceSessionId);
      setAudienceRequests(data);
    }

    void loadAudienceRequests();
    return subscribeToRequestChanges(
      {
        eventId,
        audienceSessionId,
      },
      () => {
        void loadAudienceRequests();
      },
    );
  }, [audienceSessionId, demoMode, eventId]);

  useEffect(() => {
    if (demoMode || !eventId || songResults.length === 0) {
      setSongSignals({});
      return;
    }

    async function loadSongSignals() {
      const { data } = await getSongRequestSignals(
        eventId,
        songResults.map((song) => song.providerId),
      );
      setSongSignals(data);
    }

    void loadSongSignals();
  }, [demoMode, eventId, songResults]);

  useEffect(() => {
    function syncCooldown() {
      const lastRequestAt = Number(window.localStorage.getItem(REQUEST_COOLDOWN_STORAGE_KEY));
      if (!lastRequestAt) {
        setCooldownRemaining(0);
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil((REQUEST_COOLDOWN_MS - (Date.now() - lastRequestAt)) / 1000),
      );
      setCooldownRemaining(remaining);
    }

    syncCooldown();
    const interval = window.setInterval(syncCooldown, 500);
    return () => window.clearInterval(interval);
  }, []);

  function handleDjChange(nextDjId: string) {
    setHasManualDjOverride(true);
    setDjId(nextDjId);
    window.localStorage.setItem(AUDIENCE_DJ_STORAGE_KEY, nextDjId);
  }

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  function handleSongInput(nextValue: string) {
    setSongTitle(nextValue);
    if (!selectedSong || nextValue !== formatSongRequestTitle(selectedSong)) {
      setSelectedSong(null);
    }
  }

  function handleSongSelect(song: SongSearchResult) {
    setSelectedSong(song);
    setSongTitle(formatSongRequestTitle(song));
    setSongResults([]);
    setSongSearchError(null);
  }

  function persistAudienceSession(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const sessionId = audienceSessionId || createAudienceSession().id;
    setAudienceSessionId(sessionId);

    window.localStorage.setItem(
      AUDIENCE_SESSION_STORAGE_KEY,
      JSON.stringify({
        id: sessionId,
        name: trimmedName,
        expiresAt: Date.now() + AUDIENCE_SESSION_MS,
      } satisfies AudienceSession),
    );
  }

  async function sendLike(dj: DjRow) {
    if (demoMode) {
      setLikedDjIds((current) => (current.includes(dj.id) ? current : [...current, dj.id]));
      setToast(language === "ja" ? `${dj.name} にLikeを送りました!` : `Sent love to ${dj.name}!`);
      return;
    }

    const alreadySentSingleLike = selectedEvent?.like_mode === "single" && likedDjIds.length > 0;
    if (!selectedEvent || !audienceSessionId || likedDjIds.includes(dj.id) || alreadySentSingleLike) {
      return;
    }

    const { errorMessage } = await createEventLike({
      event_id: selectedEvent.id,
      dj_id: dj.id,
      audience_session_id: audienceSessionId,
      audience_name: audienceName.trim() || null,
    });

    if (errorMessage) {
      setToast(errorMessage);
      return;
    }

    setLikedDjIds((current) => [...current, dj.id]);
    setToast(language === "ja" ? `${dj.name} にLikeを送りました!` : `Sent love to ${dj.name}!`);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSong = songTitle.trim();
    const trimmedName = audienceName.trim();
    if (!trimmedSong || !trimmedName || !selectedDj) return;

    if (isCoolingDown) {
      setToast(`${copy.cooldownMessage} ${cooldownRemaining} ${copy.cooldownSeconds}`);
      return;
    }

    setIsSending(true);
    const selectedSongStillMatches =
      selectedSong && trimmedSong === formatSongRequestTitle(selectedSong);
    if (demoMode) {
      const demoRequest: RequestRow = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `demo-request-${Date.now()}`,
        created_at: new Date().toISOString(),
        event_id: selectedEvent?.id ?? DEMO_EVENT_ID,
        dj_id: selectedDj.id,
        dj_name: selectedDj.name,
        audience_session_id: audienceSessionId || null,
        requested_by: trimmedName,
        song_title: selectedSongStillMatches ? selectedSong.title : trimmedSong,
        song_artist: selectedSongStillMatches ? selectedSong.artist : null,
        song_artwork_url: selectedSongStillMatches ? selectedSong.artworkUrl : null,
        song_provider: selectedSongStillMatches ? selectedSong.provider : null,
        song_provider_id: selectedSongStillMatches ? selectedSong.providerId : null,
        song_url: selectedSongStillMatches ? selectedSong.url : null,
        status: "pending",
      };
      setAudienceRequests((current) => [demoRequest, ...current]);
      setIsSending(false);
      setSongTitle("");
      setSelectedSong(null);
      setSongResults([]);
      persistAudienceSession(trimmedName);
      window.localStorage.setItem(REQUEST_COOLDOWN_STORAGE_KEY, String(Date.now()));
      setCooldownRemaining(Math.ceil(REQUEST_COOLDOWN_MS / 1000));
      setToast(copy.sentToDj);
      return;
    }

    const { errorMessage } = await createRequest({
      event_id: selectedEvent?.id ?? null,
      dj_id: selectedDj.id,
      dj_name: selectedDj.name,
      audience_session_id: audienceSessionId || null,
      requested_by: trimmedName,
      song_title: selectedSongStillMatches ? selectedSong.title : trimmedSong,
      song_artist: selectedSongStillMatches ? selectedSong.artist : null,
      song_artwork_url: selectedSongStillMatches ? selectedSong.artworkUrl : null,
      song_provider: selectedSongStillMatches ? selectedSong.provider : null,
      song_provider_id: selectedSongStillMatches ? selectedSong.providerId : null,
      song_url: selectedSongStillMatches ? selectedSong.url : null,
      status: "pending",
    });
    setIsSending(false);

    if (errorMessage) {
      setToast(errorMessage);
      return;
    }

    setSongTitle("");
    setSelectedSong(null);
    setSongResults([]);
    persistAudienceSession(trimmedName);
    window.localStorage.setItem(REQUEST_COOLDOWN_STORAGE_KEY, String(Date.now()));
    setCooldownRemaining(Math.ceil(REQUEST_COOLDOWN_MS / 1000));
    setToast(copy.sentToDj);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-200">
            {copy.nowPlaying}
          </p>
          <h1 className="mt-1 truncate text-2xl font-black text-white">{djName}</h1>
          {currentTimelineSlot ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-cyan-100">
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {formatTimelineRange(currentTimelineSlot)}
            </p>
          ) : null}
          {nextTimelineSlot && nextTurnDj ? (
            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {language === "ja" ? "次" : "Next"}: {nextTurnDj.name} ·{" "}
              {formatTimelineRange(nextTimelineSlot)}
            </p>
          ) : null}
          {sortedTimelineSlots.length > 0 ? (
            <button
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
              onClick={() => setIsTimelineOpen(true)}
              type="button"
            >
              <CalendarClock className="h-3.5 w-3.5 text-pink-100" aria-hidden="true" />
              {language === "ja" ? "タイムライン" : "Timeline"}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onChange={handleLanguageChange} />
          <div className="hidden h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.2)] min-[430px]:flex">
            <Music2 className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      </header>

      <section className="flex flex-1 items-center py-8">
        <div className="w-full">
          <div className="mb-7">
            <div className="mb-4 inline-flex rounded-lg border border-pink-300/20 bg-pink-300/10 px-3 py-2">
              <BrandLockup size="sm" />
            </div>
            <div className="mb-4 hidden items-center gap-2 rounded-full border border-pink-300/30 bg-pink-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-pink-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              FloorVibes
            </div>
            <div className="mb-5 flex items-end gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[conic-gradient(from_180deg,#fb5ab8,#38dfff,#a855f7,#fb5ab8)] p-1 shadow-[0_0_34px_rgba(236,72,153,0.22)]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0614]">
                  <Music2 className="h-8 w-8 text-cyan-100" aria-hidden="true" />
                </div>
              </div>
              <div className="flex h-12 flex-1 items-end gap-1" aria-hidden="true">
                <span className="h-5 flex-1 rounded-t bg-pink-400/80" />
                <span className="h-10 flex-1 rounded-t bg-cyan-300/85" />
                <span className="h-7 flex-1 rounded-t bg-purple-400/80" />
                <span className="h-12 flex-1 rounded-t bg-pink-300/80" />
                <span className="h-8 flex-1 rounded-t bg-cyan-200/85" />
                <span className="h-4 flex-1 rounded-t bg-purple-300/80" />
              </div>
            </div>
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              {copy.dropTrack}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              {copy.subtitle}
            </p>
          </div>

          <Card className="relative overflow-hidden p-4 sm:p-5">
            <div
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#fb5ab8,#38dfff,#a855f7)]"
              aria-hidden="true"
            />
            {isEventEnded && selectedEvent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-pink-300/25 bg-pink-300/10 text-pink-100">
                  <PartyPopper className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
                    {language === "ja" ? "イベント終了" : "Event ended"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">{selectedEvent.name}</h3>
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
                </div>
                <div className="grid gap-2">
                  {djs.map((dj) => {
                    const liked = likedDjIds.includes(dj.id);
                    const singleLikeUsed = selectedEvent.like_mode === "single" && likedDjIds.length > 0;
                    const disabled = liked || (singleLikeUsed && !liked);
                    return (
                      <Button
                        className="w-full"
                        disabled={disabled}
                        key={dj.id}
                        onClick={() => void sendLike(dj)}
                        type="button"
                        variant={liked ? "secondary" : "primary"}
                      >
                        <Heart className="h-5 w-5" aria-hidden="true" />
                        {liked
                          ? language === "ja"
                            ? "送ったよ、ありがとう!"
                            : "Sent. Thank you!"
                          : singleLikeUsed
                            ? language === "ja"
                              ? "Like送信済み"
                              : "Like sent"
                            : language === "ja"
                              ? `${dj.name} にLikeを送る`
                              : `Send love to ${dj.name}`}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200" htmlFor="dj">
                  <AudioWaveform className="h-4 w-4 text-pink-200" aria-hidden="true" />
                  {copy.sendRequestToDj}
                </label>
                <Select
                  id="dj"
                  aria-label={copy.selectTargetDj}
                  className="min-h-14 text-base"
                  value={djId}
                  onChange={(event) => handleDjChange(event.target.value)}
                >
                  {djs.map((dj) => (
                    <option key={dj.id} value={dj.id}>
                      {dj.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200" htmlFor="name">
                  {copy.audienceName}
                </label>
                <Input
                  id="name"
                  value={audienceName}
                  onChange={(event) => setAudienceName(event.target.value)}
                  onBlur={(event) => persistAudienceSession(event.target.value)}
                  placeholder={copy.audienceNamePlaceholder}
                  maxLength={40}
                  autoComplete="name"
                />
                <p className="text-xs font-bold text-slate-500">{copy.savedForSession}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200" htmlFor="song">
                  {copy.songLabel}
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-100/65"
                    aria-hidden="true"
                  />
                  <Input
                    id="song"
                    className="pl-12"
                    value={songTitle}
                    onChange={(event) => handleSongInput(event.target.value)}
                    placeholder={copy.songPlaceholder}
                    maxLength={140}
                    autoComplete="off"
                  />
                </div>
                {selectedSong ? (
                  <p className="text-xs font-bold text-cyan-100">
                    {language === "ja" ? "候補から選択済み" : "Selected from suggestions"}
                  </p>
                ) : null}
                {isSearchingSongs ? (
                  <p className="text-xs font-bold text-slate-400">
                    {language === "ja" ? "候補を検索中..." : "Searching songs..."}
                  </p>
                ) : null}
                {songSearchError ? (
                  <p className="text-xs font-bold text-pink-100">{songSearchError}</p>
                ) : null}
                {songResults.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-[#090411]">
                    {songResults.map((song) => {
                      const signal = songSignals[song.providerId];
                      return (
                        <button
                          className="flex min-h-16 w-full items-center gap-3 border-b border-white/10 px-3 py-2 text-left transition last:border-b-0 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
                          key={song.id}
                          onClick={() => handleSongSelect(song)}
                          type="button"
                        >
                          {song.artworkUrl ? (
                            <img
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-md object-cover"
                              src={song.artworkUrl}
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-200/10">
                              <Music2 className="h-5 w-5 text-cyan-100" aria-hidden="true" />
                            </div>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-white">
                              {song.title}
                            </span>
                            <span className="block truncate text-xs font-bold text-pink-100/85">
                              {song.artist}
                            </span>
                            {song.album ? (
                              <span className="block truncate text-xs text-slate-500">
                                {song.album}
                              </span>
                            ) : null}
                          </span>
                          {signal ? (
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <RequestStatusBadge compact status={signal.status} />
                              {signal.count > 1 ? (
                                <span className="text-[10px] font-black text-slate-500">
                                  {signal.count} req
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <Button
                className="w-full"
                disabled={
                  !songTitle.trim() ||
                  !audienceName.trim() ||
                  !selectedDj ||
                  isSending ||
                  isCoolingDown
                }
                type="submit"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
                {isCoolingDown
                  ? `${cooldownRemaining}s`
                  : isSending
                  ? copy.sending
                  : language === "ja"
                    ? `${selectedDj?.name ?? ""} に${copy.sendRequest}`
                    : `${copy.sendRequestTo} ${selectedDj?.name ?? ""}`}
              </Button>
              {isCoolingDown ? (
                <p className="text-center text-xs font-bold text-pink-100/80">
                  {copy.cooldownMessage} {cooldownRemaining} {copy.cooldownSeconds}
                </p>
              ) : null}
            </form>
            )}
          </Card>

          {isUsingMockRequests ? (
            <div className="mt-4">
              <LocalModeNotice message={copy.localMode} />
            </div>
          ) : null}

          {!isEventEnded && audienceRequests.length > 0 ? (
            <Card className="mt-4 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-white">
                  {language === "ja" ? "あなたのリクエスト" : "Your requests"}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {language === "ja" ? "このイベント中" : "This event"}
                </p>
              </div>
              <div className="space-y-2">
                {audienceRequests.slice(0, 5).map((request) => {
                  const played = request.status === "played";
                  const dismissed = request.status === "dismissed";
                  return (
                    <div
                      className={[
                        "flex items-center gap-3 rounded-lg border p-3",
                        played
                          ? "border-cyan-300/25 bg-cyan-300/10"
                          : dismissed
                            ? "border-slate-500/20 bg-white/[0.03] opacity-70"
                            : "border-white/10 bg-white/[0.04]",
                      ].join(" ")}
                      key={request.id}
                    >
                      {request.song_artwork_url ? (
                        <img
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-md object-cover"
                          src={request.song_artwork_url}
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cyan-200/15 bg-cyan-200/10">
                          <Music2 className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {request.song_title}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
                          {request.song_artist ?? (language === "ja" ? "アーティスト不明" : "Unknown artist")} · {formatRequestTime(request.created_at)}
                        </p>
                      </div>
                      <RequestStatusBadge compact status={request.status} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      </section>

      {isTimelineOpen ? (
        <div className="fixed inset-0 z-20 flex items-end bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#080310] p-4 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-pink-100">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {language === "ja" ? "DJタイムライン" : "DJ timeline"}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selectedEvent?.name ?? "FloorVibes"}
                </h2>
              </div>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setIsTimelineOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sortedTimelineSlots.map((slot) => {
                const dj = djs.find((item) => item.id === slot.dj_id);
                const isCurrent = slot.id === currentTimelineSlot?.id;
                const isNext = slot.id === nextTimelineSlot?.id;
                return (
                  <div
                    className={[
                      "rounded-lg border p-3",
                      isCurrent
                        ? "border-pink-300/30 bg-pink-300/10"
                        : isNext
                          ? "border-cyan-300/25 bg-cyan-300/10"
                          : "border-white/10 bg-white/[0.04]",
                    ].join(" ")}
                    key={slot.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-base font-black text-white">
                        {dj?.name ?? (language === "ja" ? "未設定DJ" : "Unknown DJ")}
                      </p>
                      {isCurrent || isNext ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-50">
                          {isCurrent ? (language === "ja" ? "現在" : "Now") : language === "ja" ? "次" : "Next"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-300">
                      <Clock3 className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                      {formatTimelineRange(slot)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 left-4 right-4 z-10 mx-auto max-w-sm rounded-lg border border-pink-300/30 bg-[#100719]/95 px-4 py-3 text-center text-sm font-bold text-pink-50 shadow-2xl shadow-pink-950/30">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

export default AudiencePage;
