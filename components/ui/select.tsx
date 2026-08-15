import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={[
          "min-h-12 w-full appearance-none rounded-lg border border-white/12 bg-[#12091f]/90 px-4 pr-10 text-sm font-bold text-white outline-none transition",
          "focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-200"
      />
    </div>
  );
}
