import { Disc3 } from "lucide-react";

type BrandLockupProps = {
  suffix?: string;
  size?: "sm" | "md";
};

export function BrandLockup({ suffix, size = "md" }: BrandLockupProps) {
  const isSmall = size === "sm";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-200/10 text-cyan-100",
          isSmall ? "h-8 w-8" : "h-9 w-9",
        ].join(" ")}
      >
        <Disc3 className={isSmall ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </span>
      <span
        className={[
          "truncate font-black text-white",
          isSmall ? "text-base" : "text-lg",
        ].join(" ")}
      >
        FloorVibes
        {suffix ? <span className="text-slate-300"> {suffix}</span> : null}
      </span>
    </div>
  );
}
