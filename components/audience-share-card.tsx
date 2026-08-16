"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Language } from "@/lib/i18n";
import { text } from "@/lib/i18n";

type AudienceShareCardProps = {
  eventSlug: string;
  djId: string;
  djName: string;
  language: Language;
};

export function AudienceShareCard({ eventSlug, djId, djName, language }: AudienceShareCardProps) {
  const copy = text[language];
  const [origin, setOrigin] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const audienceUrl = useMemo(() => {
    if (!origin) return "";
    const params = new URLSearchParams({ dj: djId });
    return `${origin}/e/${encodeURIComponent(eventSlug)}?${params.toString()}`;
  }, [djId, eventSlug, origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!audienceUrl) return;

    void QRCode.toDataURL(audienceUrl, {
      color: {
        dark: "#0b0614",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
    }).then(setQrDataUrl);
  }, [audienceUrl]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function copyLink() {
    if (!audienceUrl) return;
    await navigator.clipboard.writeText(audienceUrl);
    setStatus(copy.copiedLink);
  }

  async function shareLink() {
    if (!audienceUrl) return;

    if (navigator.share) {
      await navigator.share({
        title: "FloorVibes",
        text: `${copy.sendRequestTo} ${djName}`,
        url: audienceUrl,
      });
      return;
    }

    await copyLink();
  }

  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38dfff,#fb5ab8,#a855f7)]"
        aria-hidden="true"
      />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="mx-auto flex aspect-square w-44 items-center justify-center rounded-lg border border-white/12 bg-white p-2">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={copy.audienceQrAlt} className="h-full w-full" src={qrDataUrl} />
          ) : (
            <QrCode className="h-12 w-12 text-slate-900" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-pink-100">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            {copy.shareAudienceLink}
          </p>
          <p className="mt-2 break-all text-sm font-bold text-slate-300">{audienceUrl}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => void copyLink()} type="button" variant="secondary">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copy.copyLink}
            </Button>
            <Button onClick={() => void shareLink()} type="button">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {copy.share}
            </Button>
          </div>
          {status ? <p className="mt-3 text-sm font-bold text-cyan-100">{status}</p> : null}
        </div>
      </div>
    </Card>
  );
}
