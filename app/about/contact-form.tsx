"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContactMessage } from "@/lib/contact-store";

type FormFeedback = {
  type: "success" | "error";
  message: string;
};

export function ContactForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    if (!trimmedSubject) {
      setFeedback({ type: "error", message: "件名を入力してください。" });
      return;
    }

    if (!trimmedBody) {
      setFeedback({ type: "error", message: "本文を入力してください。" });
      return;
    }

    setIsSending(true);
    const { errorMessage } = await createContactMessage({
      subject: trimmedSubject,
      body: trimmedBody,
      contact,
      source: "about",
    });
    setIsSending(false);

    if (errorMessage) {
      setFeedback({
        type: "error",
        message: `送信できませんでした: ${errorMessage}`,
      });
      return;
    }

    setSubject("");
    setBody("");
    setFeedback({
      type: "success",
      message: "送信しました。ありがとうございます。",
    });
  }

  return (
    <form className="mt-6 space-y-3 text-left" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
          Subject
        </span>
        <Input
          className="mt-2 min-h-12"
          maxLength={120}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="例: イベント利用について相談したい"
          value={subject}
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
          Message
        </span>
        <textarea
          className={[
            "mt-2 min-h-36 w-full resize-y rounded-lg border border-white/12 bg-[#12091f]/80 px-4 py-3 text-base text-white outline-none transition",
            "placeholder:text-slate-500 focus:border-pink-300/70 focus:bg-[#170d28] focus:ring-4 focus:ring-pink-300/10",
          ].join(" ")}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="検証したい内容、質問、フィードバックなどを自由に送ってください。"
          value={body}
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
          Reply contact optional
        </span>
        <Input
          className="mt-2 min-h-12"
          maxLength={160}
          onChange={(event) => setContact(event.target.value)}
          placeholder="返信先メール、Instagram、Xなど"
          value={contact}
        />
      </label>

      {feedback ? (
        <div
          className={[
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold",
            feedback.type === "success"
              ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-50"
              : "border-pink-300/30 bg-pink-500/10 text-pink-50",
          ].join(" ")}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {feedback.message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isSending} type="submit">
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSending ? "Sending..." : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
