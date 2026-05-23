"use client";

import { LANGUAGES } from "./contentTypes";
import type { Language } from "./contentTypes";

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

export function LanguageSelect({ value, onChange }: Props): React.ReactElement {
  return (
    <div className="flex items-center rounded border border-black/15 dark:border-white/15 overflow-hidden">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onChange(lang.id)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === lang.id
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
