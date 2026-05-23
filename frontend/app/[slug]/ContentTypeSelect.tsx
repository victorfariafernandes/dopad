"use client";

import { CONTENT_TYPES } from "./contentTypes";
import type { ContentType } from "./contentTypes";

interface Props {
  value: ContentType;
  onChange: (type: ContentType) => void;
}

export function ContentTypeSelect({ value, onChange }: Props): React.ReactElement {
  return (
    <div className="flex items-center rounded border border-black/15 dark:border-white/15 overflow-hidden">
      {CONTENT_TYPES.map((ct) => (
        <button
          key={ct.id}
          type="button"
          onClick={() => onChange(ct.id)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === ct.id
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {ct.label}
        </button>
      ))}
    </div>
  );
}
