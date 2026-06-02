import React from "react";
import { useLanguage } from "@/lib/i18n";

const languages = [
  { code: "pt-BR", flag: "🇧🇷", label: "PT" },
  { code: "en",   flag: "🇺🇸", label: "EN" },
  { code: "es",   flag: "🇪🇸", label: "ES" },
];

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono transition-all ${
            lang === l.code
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}