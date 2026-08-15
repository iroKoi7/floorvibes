import { DatabaseZap } from "lucide-react";

type LocalModeNoticeProps = {
  message: string;
};

export function LocalModeNotice({ message }: LocalModeNoticeProps) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
      <div className="flex gap-3">
        <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-pink-200" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}
