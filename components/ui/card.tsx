import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-lg border border-white/12 bg-[#0f0719]/82 shadow-2xl shadow-pink-950/20 backdrop-blur",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
