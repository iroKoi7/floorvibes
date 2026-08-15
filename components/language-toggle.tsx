import type { Language } from "@/lib/i18n";

type LanguageToggleProps = {
  language: Language;
  onChange: (language: Language) => void;
};

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div
      aria-label="Language"
      className="grid grid-cols-2 rounded-lg border border-white/10 bg-white/[0.06] p-1"
      role="group"
    >
      {(["en", "ja"] as const).map((option) => (
        <button
          key={option}
          className={[
            "min-h-9 rounded-md px-3 text-xs font-black uppercase transition",
            language === option
              ? "bg-pink-300 text-[#110719]"
              : "text-slate-300 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
