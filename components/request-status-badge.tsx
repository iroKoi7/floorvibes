import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import type { RequestStatus } from "@/lib/types";

type RequestStatusBadgeProps = {
  status: RequestStatus;
  compact?: boolean;
};

export function getRequestStatusLabel(status: RequestStatus) {
  if (status === "played") return "Played!";
  if (status === "dismissed") return "Dismissed";
  return "Waiting...";
}

export function RequestStatusBadge({ status, compact = false }: RequestStatusBadgeProps) {
  const Icon = status === "played" ? CheckCircle2 : status === "dismissed" ? XCircle : Sparkles;

  return (
    <span
      className={[
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-black",
        compact ? "px-2 py-1 text-[11px]" : "px-2 py-1 text-[11px]",
        status === "played"
          ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-50"
          : status === "dismissed"
            ? "border-slate-500/25 bg-slate-500/10 text-slate-300"
            : "border-pink-300/25 bg-pink-300/10 text-pink-100",
      ].join(" ")}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} aria-hidden="true" />
      {getRequestStatusLabel(status)}
    </span>
  );
}
