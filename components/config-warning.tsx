import { AlertTriangle } from "lucide-react";

export function ConfigWarning() {
  return (
    <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to your environment.
        </p>
      </div>
    </div>
  );
}
