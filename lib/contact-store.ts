import { supabase } from "@/lib/supabase";
import type { ContactMessageInsert, ContactMessageRow } from "@/lib/types";

const MOCK_CONTACT_MESSAGES_KEY = "floorvibes:mock-contact-messages";

function createMockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readMockMessages() {
  if (typeof window === "undefined") return [];

  const rawRows = window.localStorage.getItem(MOCK_CONTACT_MESSAGES_KEY);
  if (!rawRows) return [];

  try {
    return JSON.parse(rawRows) as ContactMessageRow[];
  } catch {
    window.localStorage.removeItem(MOCK_CONTACT_MESSAGES_KEY);
    return [];
  }
}

function writeMockMessages(rows: ContactMessageRow[]) {
  window.localStorage.setItem(MOCK_CONTACT_MESSAGES_KEY, JSON.stringify(rows));
}

export async function createContactMessage(message: ContactMessageInsert) {
  const payload: ContactMessageInsert = {
    ...message,
    subject: message.subject.trim(),
    body: message.body.trim(),
    contact: message.contact?.trim() || null,
    source: message.source ?? "about",
    status: "new",
  };

  if (supabase) {
    const { error } = await supabase
      .from("contact_messages")
      .insert(payload);

    return { data: null, errorMessage: error?.message ?? null };
  }

  const nextMessage: ContactMessageRow = {
    id: createMockId(),
    created_at: new Date().toISOString(),
    subject: payload.subject,
    body: payload.body,
    contact: payload.contact ?? null,
    source: payload.source ?? "about",
    status: "new",
  };
  const messages = [nextMessage, ...readMockMessages()];
  writeMockMessages(messages);
  return { data: nextMessage, errorMessage: null };
}

export async function getContactMessages() {
  return { data: readMockMessages(), errorMessage: null };
}
