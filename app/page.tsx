"use client";

import { FormEvent, useEffect, useState } from "react";
import { AudioWaveform, Disc3, Music2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { createRequest, isUsingMockRequests } from "@/lib/request-store";
import type { DjRow, EventRow } from "@/lib/types";

const AUDIENCE_EVENT_STORAGE_KEY = "floorvibes:audience-event";
const AUDIENCE_DJ_STORAGE_KEY = "floorvibes:audience-dj-id";
const AUDIENCE_SESSION_STORAGE_KEY = "floorvibes:audience-session";
const REQUEST_COOLDOWN_STORAGE_KEY = "floorvibes:last-request-at";
const REQUEST_COOLDOWN_MS = 30 * 1000;
const AUDIENCE_SESSION_MS = 3 * 60 * 60 * 1000;

type AudienceSession = {
  name: string;
  expiresAt: number;
};

type AudiencePageProps = {
  fixedEventSlug?: string;
};

export function AudiencePage({ fixedEventSlug }: AudiencePageProps = {}) {
  const [songTitle, setSongTitle] = useState("");
  const [audienceName, setAudienceName] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [djs, setDjs] = useState<DjRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [djId, setDjId] = useState("");
  const [eventSlug, setEventSlug] = useState(DEFAULT_EVENT_SLUG);
  const [language, setLanguage] = useState<Language>("en");
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const copy = text[language];
  const isCoolingDown = cooldownRemaining > 0;
  const selectedEvent = events.find((event) => event.id === eventId) ?? null;
  const selectedDj = djs.find((dj) => dj.id === djId) ?? null;
  const djName = selectedDj?.name ?? copy.loadingRequests;

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
    }

    const rawSession = window.localStorage.getItem(AUDIENCE_SESSION_STORAGE_KEY);
    if (!rawSession) return;

    try {
      const session = JSON.parse(rawSession) as AudienceSession;
      if (session.expiresAt > Date.now()) {
        setAudienceName(session.name);
      } else {
        window.localStorage.removeItem(AUDIENCE_SESSION_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(AUDIENCE_SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    async function loadEvents() {
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
  }, [fixedEventSlug]);

  useEffect(() => {
    if (!eventId) return;

    async function loadDjs() {
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
  }, [eventId]);

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
    setDjId(nextDjId);
    window.localStorage.setItem(AUDIENCE_DJ_STORAGE_KEY, nextDjId);
  }

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  function persistAudienceSession(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    window.localStorage.setItem(
      AUDIENCE_SESSION_STORAGE_KEY,
      JSON.stringify({
        name: trimmedName,
        expiresAt: Date.now() + AUDIENCE_SESSION_MS,
      } satisfies AudienceSession),
    );
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
    const { errorMessage } = await createRequest({
      event_id: selectedEvent?.id ?? null,
      dj_id: selectedDj.id,
      dj_name: selectedDj.name,
      requested_by: trimmedName,
      song_title: trimmedSong,
      status: "pending",
    });
    setIsSending(false);

    if (errorMessage) {
      setToast(errorMessage);
      return;
    }

    setSongTitle("");
    persistAudienceSession(trimmedName);
    window.localStorage.setItem(REQUEST_COOLDOWN_STORAGE_KEY, String(Date.now()));
    setCooldownRemaining(Math.ceil(REQUEST_COOLDOWN_MS / 1000));
    setToast(copy.sentToDj);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-200">
            {copy.nowPlaying}
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">{djName}</h1>
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-pink-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              FloorVibes
            </div>
            <div className="mb-5 flex items-end gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[conic-gradient(from_180deg,#fb5ab8,#38dfff,#a855f7,#fb5ab8)] p-1 shadow-[0_0_34px_rgba(236,72,153,0.22)]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0614]">
                  <Disc3 className="h-8 w-8 text-cyan-100" aria-hidden="true" />
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

              <label className="block text-sm font-bold text-slate-200" htmlFor="song">
                {copy.songLabel}
              </label>
              <Input
                id="song"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                placeholder={copy.songPlaceholder}
                maxLength={140}
                autoComplete="off"
              />
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
          </Card>

          {isUsingMockRequests ? (
            <div className="mt-4">
              <LocalModeNotice message={copy.localMode} />
            </div>
          ) : null}
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-5 left-4 right-4 z-10 mx-auto max-w-sm rounded-lg border border-pink-300/30 bg-[#100719]/95 px-4 py-3 text-center text-sm font-bold text-pink-50 shadow-2xl shadow-pink-950/30">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

export default AudiencePage;
