import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary:
    "bg-[linear-gradient(135deg,#fb5ab8_0%,#38dfff_52%,#a855f7_100%)] text-white shadow-[0_0_34px_rgba(236,72,153,0.28)] hover:brightness-110",
  secondary:
    "border border-cyan-200/20 bg-cyan-200/10 text-cyan-50 hover:bg-cyan-200/16",
  danger:
    "border border-pink-300/30 bg-pink-500/16 text-pink-50 hover:bg-pink-500/25",
  ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
