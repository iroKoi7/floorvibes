import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "min-h-14 w-full rounded-lg border border-white/12 bg-[#12091f]/80 px-4 text-base text-white outline-none transition",
        "placeholder:text-slate-500 focus:border-pink-300/70 focus:bg-[#170d28] focus:ring-4 focus:ring-pink-300/10",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
