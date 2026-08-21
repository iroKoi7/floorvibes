"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, CheckCircle2, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { AdminSignOutButton } from "@/app/admin/_components/admin-sign-out-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDj,
  createEvent,
  DEFAULT_END_MESSAGE,
  deleteDj,
  getDjsForEvent,
  getEventById,
  getTimelineSlotsForEvent,
  replaceTimelineSlotsForEvent,
  slugify,
  updateDj,
  updateEvent,
} from "@/lib/event-store";
import type { DjRow, EventRow } from "@/lib/types";

type Feedback = {
  type: "success" | "error";
  message: string;
};

type DraftDj = DjRow & {
  isDraft?: boolean;
};

type DraftTimelineSlot = {
  id: string;
  djId: string;
  startsAt: string;
  endsAt: string;
};

type EventEditorProps = {
  eventId?: string;
  mode: "create" | "edit";
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DRAFT_DJ_PREFIX = "draft-dj-";
const DRAFT_TIMELINE_PREFIX = "draft-timeline-";

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function normalizeOptionalUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return { value: null, error: null };

  const urlWithProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const url = new URL(urlWithProtocol);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { value: null, error: "CTA URL must start with http or https." };
    }

    return { value: url.toString(), error: null };
  } catch {
    return { value: null, error: "CTA URL must be a valid link." };
  }
}

export function EventEditor({ eventId, mode }: EventEditorProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [endMessage, setEndMessage] = useState(DEFAULT_END_MESSAGE);
  const [endCtaLabel, setEndCtaLabel] = useState("");
  const [endCtaUrl, setEndCtaUrl] = useState("");
  const [likeMode, setLikeMode] = useState<"single" | "multiple">("multiple");
  const [djs, setDjs] = useState<DraftDj[]>([]);
  const [deletedDjIds, setDeletedDjIds] = useState<string[]>([]);
  const [timelineSlots, setTimelineSlots] = useState<DraftTimelineSlot[]>([]);
  const [newDjName, setNewDjName] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const visibleDjs = djs.filter((dj) => !deletedDjIds.includes(dj.id));

  useEffect(() => {
    if (mode !== "edit" || !eventId) return;
    const currentEventId = eventId;

    async function loadEvent() {
      setIsLoading(true);
      const [
        { data: event, errorMessage: eventError },
        { data: eventDjs, errorMessage: djsError },
        { data: eventTimeline, errorMessage: timelineError },
      ] = await Promise.all([
        getEventById(currentEventId),
        getDjsForEvent(currentEventId, true),
        getTimelineSlotsForEvent(currentEventId),
      ]);

      if (eventError || djsError || timelineError) {
        setFeedback({
          type: "error",
          message: eventError || djsError || timelineError || "Failed to load event.",
        });
        setIsLoading(false);
        return;
      }

      if (!event) {
        setFeedback({ type: "error", message: "Event not found." });
        setIsLoading(false);
        return;
      }

      setEventName(event.name);
      setEventSlug(event.slug);
      setStartsAt(toDateTimeLocal(event.starts_at));
      setEndsAt(toDateTimeLocal(event.ends_at));
      setEndMessage(event.end_message || DEFAULT_END_MESSAGE);
      setEndCtaLabel(event.end_cta_label ?? "");
      setEndCtaUrl(event.end_cta_url ?? "");
      setLikeMode(event.like_mode ?? "multiple");
      setDjs(eventDjs);
      setTimelineSlots(
        eventTimeline.map((slot) => ({
          id: slot.id,
          djId: slot.dj_id,
          startsAt: toDateTimeLocal(slot.starts_at),
          endsAt: toDateTimeLocal(slot.ends_at),
        })),
      );
      setDeletedDjIds([]);
      setIsLoading(false);
    }

    void loadEvent();
  }, [eventId, mode]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function validateEvent() {
    const name = eventName.trim();
    const slug = eventSlug.trim();
    const start = startsAt ? new Date(startsAt) : null;
    const end = endsAt ? new Date(endsAt) : null;

    if (!name) return "Event name is required.";
    if (!slug) return "URL slug is required.";
    if (slug.length > 48) return "URL slug must be 48 characters or fewer.";
    if (!SLUG_PATTERN.test(slug)) {
      return "URL slug can use lowercase letters, numbers, and single hyphens only.";
    }
    if (start && end && end <= start) return "End time must be after start time.";
    if (endMessage.trim().length > 280) return "End message must be 280 characters or fewer.";
    if (endCtaLabel.trim().length > 40) return "CTA label must be 40 characters or fewer.";
    const normalizedCtaUrl = normalizeOptionalUrl(endCtaUrl);
    if (normalizedCtaUrl.error) return normalizedCtaUrl.error;
    if (endCtaLabel.trim() && !endCtaUrl.trim()) return "CTA URL is required when CTA label is set.";
    if (!endCtaLabel.trim() && endCtaUrl.trim()) return "CTA label is required when CTA URL is set.";
    if (visibleDjs.length === 0) return "Add at least one DJ before saving.";
    if (visibleDjs.some((dj) => !dj.name.trim())) return "DJ name is required.";
    if (
      timelineSlots.some(
        (slot) =>
          !visibleDjs.some((dj) => dj.id === slot.djId) ||
          !slot.startsAt ||
          !slot.endsAt ||
          new Date(slot.endsAt) <= new Date(slot.startsAt),
      )
    ) {
      return "Timeline slots need a DJ and a valid start/end time.";
    }

    const duplicateDj = visibleDjs.find((dj, index) =>
      visibleDjs.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index &&
          candidate.name.trim().toLowerCase() === dj.name.trim().toLowerCase(),
      ),
    );
    if (duplicateDj) return `${duplicateDj.name.trim()} is duplicated.`;

    return null;
  }

  function handleAddDj(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newDjName.trim();
    if (!name) {
      setFeedback({ type: "error", message: "DJ name is required." });
      return;
    }

    setDjs((current) => [
      ...current,
      {
        id: `${DRAFT_DJ_PREFIX}${Date.now()}`,
        event_id: eventId ?? "",
        created_at: new Date().toISOString(),
        name,
        is_active: true,
        sort_order: current.length,
        isDraft: true,
      },
    ]);
    setNewDjName("");
    setFeedback({ type: "success", message: `${name} added to draft.` });
  }

  function removeDj(dj: DraftDj) {
    if (dj.isDraft) {
      setDjs((current) => current.filter((row) => row.id !== dj.id));
    } else {
      setDeletedDjIds((current) => (current.includes(dj.id) ? current : [...current, dj.id]));
    }

    setTimelineSlots((current) => current.filter((slot) => slot.djId !== dj.id));
    setFeedback({ type: "success", message: `${dj.name} removed from draft.` });
  }

  function addTimelineSlot() {
    const defaultDj = visibleDjs[0];
    if (!defaultDj) {
      setFeedback({ type: "error", message: "Add a DJ before adding timeline slots." });
      return;
    }

    setTimelineSlots((current) => [
      ...current,
      {
        id: `${DRAFT_TIMELINE_PREFIX}${Date.now()}`,
        djId: defaultDj.id,
        startsAt,
        endsAt,
      },
    ]);
  }

  function updateTimelineSlot(id: string, updates: Partial<DraftTimelineSlot>) {
    setTimelineSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot)),
    );
  }

  function removeTimelineSlot(id: string) {
    setTimelineSlots((current) => current.filter((slot) => slot.id !== id));
  }

  async function saveEvent() {
    const validationError = validateEvent();
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    setIsSaving(true);
    const normalizedCtaUrl = normalizeOptionalUrl(endCtaUrl).value;

    let savedEvent: EventRow | null = null;
    if (mode === "create") {
      const { data, errorMessage } = await createEvent({
        name: eventName.trim(),
        slug: eventSlug.trim(),
        starts_at: fromDateTimeLocal(startsAt),
        ends_at: fromDateTimeLocal(endsAt),
        end_message: endMessage.trim() || DEFAULT_END_MESSAGE,
        end_cta_label: endCtaLabel.trim() || null,
        end_cta_url: normalizedCtaUrl,
        like_mode: likeMode,
        is_active: true,
      });

      if (errorMessage || !data) {
        setIsSaving(false);
        setFeedback({ type: "error", message: errorMessage || "Failed to create event." });
        return;
      }

      savedEvent = data;
    } else if (eventId) {
      const { errorMessage } = await updateEvent(eventId, {
        name: eventName.trim(),
        slug: eventSlug.trim(),
        starts_at: fromDateTimeLocal(startsAt),
        ends_at: fromDateTimeLocal(endsAt),
        end_message: endMessage.trim() || DEFAULT_END_MESSAGE,
        end_cta_label: endCtaLabel.trim() || null,
        end_cta_url: normalizedCtaUrl,
        like_mode: likeMode,
      });

      if (errorMessage) {
        setIsSaving(false);
        setFeedback({ type: "error", message: errorMessage });
        return;
      }

      savedEvent = {
        id: eventId,
        created_at: "",
        owner_id: null,
        name: eventName.trim(),
        slug: eventSlug.trim(),
        starts_at: fromDateTimeLocal(startsAt),
        ends_at: fromDateTimeLocal(endsAt),
        end_message: endMessage.trim() || DEFAULT_END_MESSAGE,
        end_cta_label: endCtaLabel.trim() || null,
        end_cta_url: normalizedCtaUrl,
        like_mode: likeMode,
        is_active: true,
      };
    }

    if (!savedEvent) {
      setIsSaving(false);
      setFeedback({ type: "error", message: "Event could not be saved." });
      return;
    }

    for (const id of deletedDjIds) {
      const { errorMessage } = await deleteDj(id);
      if (errorMessage) {
        setIsSaving(false);
        setFeedback({ type: "error", message: errorMessage });
        return;
      }
    }

    const savedDjIdByDraftId = new Map<string, string>();

    for (const [index, dj] of visibleDjs.entries()) {
      if (dj.isDraft) {
        const { errorMessage } = await createDj({
          event_id: savedEvent.id,
          name: dj.name.trim(),
          sort_order: index,
          is_active: true,
        });

        if (errorMessage) {
          setIsSaving(false);
          setFeedback({ type: "error", message: errorMessage });
          return;
        }

        const { data: refreshedDjs } = await getDjsForEvent(savedEvent.id, true);
        const createdDj = refreshedDjs.find(
          (row) => row.name.trim().toLowerCase() === dj.name.trim().toLowerCase(),
        );
        if (createdDj) savedDjIdByDraftId.set(dj.id, createdDj.id);
      } else {
        const { errorMessage } = await updateDj(dj.id, {
          name: dj.name.trim(),
          sort_order: index,
          is_active: true,
        });

        if (errorMessage) {
          setIsSaving(false);
          setFeedback({ type: "error", message: errorMessage });
          return;
        }
        savedDjIdByDraftId.set(dj.id, dj.id);
      }
    }

    const timelinePayload = timelineSlots
      .filter((slot) => visibleDjs.some((dj) => dj.id === slot.djId))
      .map((slot, index) => ({
        event_id: savedEvent.id,
        dj_id: savedDjIdByDraftId.get(slot.djId) ?? slot.djId,
        starts_at: fromDateTimeLocal(slot.startsAt) ?? "",
        ends_at: fromDateTimeLocal(slot.endsAt) ?? "",
        sort_order: index,
      }));

    const { errorMessage: timelineError } = await replaceTimelineSlotsForEvent(
      savedEvent.id,
      timelinePayload,
    );
    if (timelineError) {
      setIsSaving(false);
      setFeedback({ type: "error", message: timelineError });
      return;
    }

    setFeedback({ type: "success", message: "Event saved." });
    router.push("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-pink-200">
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            FloorVibes Owner Console
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">
            {mode === "create" ? "Create event" : "Edit event"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSignOutButton />
          <Link className="text-sm font-bold text-cyan-100 hover:text-white" href="/admin">
            Back to events
          </Link>
        </div>
      </header>

      {isLoading ? (
        <Card className="p-5 text-sm font-bold text-slate-300">Loading event...</Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Event settings</h2>
              {feedback ? (
                <p
                  className={[
                    "flex items-center gap-2 text-sm font-bold",
                    feedback.type === "success" ? "text-cyan-100" : "text-pink-100",
                  ].join(" ")}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {feedback.message}
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Event name
                </label>
                <Input
                  aria-label="Event name"
                  className="mt-2"
                  value={eventName}
                  onChange={(event) => {
                    setEventName(event.target.value);
                    if (mode === "create") setEventSlug(slugify(event.target.value));
                  }}
                  placeholder="Event name"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  URL slug
                </label>
                <Input
                  aria-label="URL slug"
                  className="mt-2"
                  value={eventSlug}
                  onChange={(event) => setEventSlug(slugify(event.target.value))}
                  placeholder="url-slug"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Starts at
                </label>
                <Input
                  aria-label="Starts at"
                  className="mt-2"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Ends at
                </label>
                <Input
                  aria-label="Ends at"
                  className="mt-2"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  End message
                </label>
                <textarea
                  aria-label="End message"
                  className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/12 bg-[#12091f]/80 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-pink-300/70 focus:bg-[#170d28] focus:ring-4 focus:ring-pink-300/10"
                  maxLength={280}
                  onChange={(event) => setEndMessage(event.target.value)}
                  placeholder={DEFAULT_END_MESSAGE}
                  value={endMessage}
                />
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Shown after the event ends. {endMessage.length}/280
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Like mode
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
                  <button
                    className={[
                      "min-h-11 rounded-md px-3 text-sm font-black transition",
                      likeMode === "multiple"
                        ? "bg-white text-[#12091f]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                    onClick={() => setLikeMode("multiple")}
                    type="button"
                  >
                    Multiple DJs
                  </button>
                  <button
                    className={[
                      "min-h-11 rounded-md px-3 text-sm font-black transition",
                      likeMode === "single"
                        ? "bg-white text-[#12091f]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                    onClick={() => setLikeMode("single")}
                    type="button"
                  >
                    One DJ only
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  CTA label
                </label>
                <Input
                  aria-label="CTA label"
                  className="mt-2"
                  maxLength={40}
                  onChange={(event) => setEndCtaLabel(event.target.value)}
                  placeholder="Next event / Survey"
                  value={endCtaLabel}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  CTA URL
                </label>
                <Input
                  aria-label="CTA URL"
                  className="mt-2"
                  inputMode="url"
                  onChange={(event) => setEndCtaUrl(event.target.value)}
                  placeholder="instagram.com/floorvibes"
                  type="text"
                  value={endCtaUrl}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-white">DJs</h2>
              <form className="grid gap-2 sm:grid-cols-[220px_auto]" onSubmit={handleAddDj}>
                <Input
                  value={newDjName}
                  onChange={(event) => setNewDjName(event.target.value)}
                  placeholder="DJ name"
                />
                <Button type="submit" variant="ghost">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Add DJ
                </Button>
              </form>
            </div>

            <div className="mt-5 space-y-3">
              {visibleDjs.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-300">
                  Add at least one DJ for this event.
                </p>
              ) : null}

              {visibleDjs.map((dj) => (
                <div
                  className="grid gap-2 rounded-lg border border-white/10 bg-[#12091f]/70 p-3 sm:grid-cols-[1fr_auto]"
                  key={dj.id}
                >
                  <Input
                    aria-label={`${dj.name} name`}
                    value={dj.name}
                    onChange={(event) =>
                      setDjs((current) =>
                        current.map((row) =>
                          row.id === dj.id ? { ...row, name: event.target.value } : row,
                        ),
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <Button
                    className="min-h-9 px-3 py-2 text-xs"
                    type="button"
                    variant="ghost"
                    onClick={() => removeDj(dj)}
                  >
                    <Trash2 className="h-4 w-4 text-pink-200" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-white">
                  <CalendarClock className="h-5 w-5 text-cyan-100" aria-hidden="true" />
                  DJ timeline
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  Set who is on turn. Audience and DJ screens will follow the current time.
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={addTimelineSlot}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add slot
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {timelineSlots.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-300">
                  No timeline yet. Without a timeline, users can choose a DJ manually.
                </p>
              ) : null}

              {timelineSlots.map((slot, index) => (
                <div
                  className="grid gap-2 rounded-lg border border-white/10 bg-[#12091f]/70 p-3 sm:grid-cols-[1fr_190px_190px_auto]"
                  key={slot.id}
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      DJ
                    </label>
                    <select
                      aria-label={`Timeline slot ${index + 1} DJ`}
                      className="mt-2 min-h-11 w-full rounded-lg border border-white/12 bg-[#12091f]/80 px-3 py-2 text-sm font-bold text-white outline-none transition focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-200/10"
                      value={slot.djId}
                      onChange={(event) => updateTimelineSlot(slot.id, { djId: event.target.value })}
                    >
                      {visibleDjs.map((dj) => (
                        <option key={dj.id} value={dj.id}>
                          {dj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Starts
                    </label>
                    <Input
                      aria-label={`Timeline slot ${index + 1} starts`}
                      className="mt-2"
                      type="datetime-local"
                      value={slot.startsAt}
                      onChange={(event) =>
                        updateTimelineSlot(slot.id, { startsAt: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Ends
                    </label>
                    <Input
                      aria-label={`Timeline slot ${index + 1} ends`}
                      className="mt-2"
                      type="datetime-local"
                      value={slot.endsAt}
                      onChange={(event) =>
                        updateTimelineSlot(slot.id, { endsAt: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="min-h-10 px-3 py-2 text-xs"
                      type="button"
                      variant="ghost"
                      onClick={() => removeTimelineSlot(slot.id)}
                    >
                      <Trash2 className="h-4 w-4 text-pink-200" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <Button
              className="w-full"
              disabled={isSaving}
              onClick={() => void saveEvent()}
              type="button"
              variant="secondary"
            >
              <Save className="h-5 w-5" aria-hidden="true" />
              {isSaving ? "Saving..." : "Save event"}
            </Button>
          </Card>
        </div>
      )}

      {feedback ? (
        <div
          className={[
            "fixed bottom-5 left-4 right-4 z-10 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-lg border px-4 py-3 text-center text-sm font-bold shadow-2xl",
            feedback.type === "success"
              ? "border-cyan-300/30 bg-[#071319]/95 text-cyan-50 shadow-cyan-950/20"
              : "border-pink-300/30 bg-[#100719]/95 text-pink-50 shadow-pink-950/30",
          ].join(" ")}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {feedback.message}
        </div>
      ) : null}
    </main>
  );
}
