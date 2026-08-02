import { Languages } from "lucide-react";
import { LANGUAGE_OPTIONS, useI18n, type Language } from "@/lib/i18n";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-2xl border border-white/10 bg-[#070707]/92 p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md ${compact ? "w-full justify-between" : "gap-1.5"}`}
      aria-label={t("language.label")}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/70 text-[#d4af37] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Languages size={14} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 items-center gap-1">
        {LANGUAGE_OPTIONS.map((option) => {
          const active = option.value === language;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value as Language)}
              className={`flex h-8 min-w-9 items-center justify-center rounded-xl px-2.5 text-[9px] font-black uppercase tracking-[0.08em] transition-all ${
                active
                  ? "bg-[#d4af37] text-black shadow-[0_5px_13px_rgba(212,175,55,0.28),inset_0_1px_0_rgba(255,255,255,0.35)]"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/80"
              }`}
              aria-pressed={active}
              title={option.label}
            >
              {option.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
