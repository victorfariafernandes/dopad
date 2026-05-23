"use client";

import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEffect, useState } from "react";
import type { Language } from "./contentTypes";

const languageExtension = {
  javascript: () => javascript({ jsx: false }),
  c: () => cpp(),
  python: () => python(),
} satisfies Record<Language, () => unknown>;

interface Props {
  body: string;
  language: Language;
  onChange: (value: string) => void;
}

export function CodeEditor({ body, language, onChange }: Props): React.ReactElement {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <ReactCodeMirror
      value={body}
      onChange={onChange}
      extensions={[languageExtension[language]()]}
      theme={isDark ? oneDark : "light"}
      height="100%"
      className="flex-1 overflow-auto text-sm font-mono"
      basicSetup={{ lineNumbers: true, foldGutter: false }}
    />
  );
}
