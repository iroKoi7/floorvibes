"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDj,
  createEvent,
  deleteDj,
  getDjsForEvent,
  getEventById,
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

type EventEditorProps = {
  eventId?: string;
  mode: "create" | "edit";
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DRAFT_DJ_PREFIX = "draft-dj-";

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

export function EventEditor({ eventId, mode }: EventEditorProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [djs, setDjs] = useState<DraftDj[]>([]);
  const [deletedDjIds, setDeletedDjIds] = useState<string[]>([]);
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
      const [{ data: event, errorMessage: eventError }, { data: eventDjs, errorMessage: djsError }] =
        await Promise.all([getEventById(currentEventId), getDjsForEvent(currentEventId, true)]);

      if (eventError || djsError) {
        setFeedback({ type: "error", message: eventError || djsError || "Failed to load event." });
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
      setDjs(eventDjs);
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
    if (visibleDjs.length === 0) return "Add at least one DJ before saving.";
    if (visibleDjs.some((dj) => !dj.name.trim())) return "DJ name is required.";

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

    setFeedback({ type: "success", message: `${dj.name} removed from draft.` });
  }

  async function saveEvent() {
    const validationError = validateEvent();
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    setIsSaving(true);

    let savedEvent: EventRow | null = null;
    if (mode === "create") {
      const { data, errorMessage } = await createEvent({
        name: eventName.trim(),
        slug: eventSlug.trim(),
        starts_at: fromDateTimeLocal(startsAt),
        ends_at: fromDateTimeLocal(endsAt),
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
      });

      if (errorMessage) {
        setIsSaving(false);
        setFeedback({ type: "error", message: errorMessage });
        return;
      }

      savedEvent = {
        id: eventId,
        created_at: "",
        name: eventName.trim(),
        slug: eventSlug.trim(),
        starts_at: fromDateTimeLocal(startsAt),
        ends_at: fromDateTimeLocal(endsAt),
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
      }
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
            FloorVibes Admin
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">
            {mode === "create" ? "Create event" : "Edit event"}
          </h1>
        </div>
        <Link className="text-sm font-bold text-cyan-100 hover:text-white" href="/admin">
          Back to events
        </Link>
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
