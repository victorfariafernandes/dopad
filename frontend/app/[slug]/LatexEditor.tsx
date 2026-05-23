"use client";

import { useEffect, useRef } from "react";

const LATEX_JS_CDN = "https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/latex.mjs";

interface Props {
  body: string;
  onChange: (value: string) => void;
}

export function LatexEditor({ body, onChange }: Props): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // JSON.stringify safely encodes the LaTeX source as a JS string literal,
    // handling all special characters including backslashes and quotes.
    const encodedBody = JSON.stringify(body);

    iframe.srcdoc = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<script type="module">
  import { LaTeXJSComponent } from ${JSON.stringify(LATEX_JS_CDN)};
  customElements.define("latex-js", LaTeXJSComponent);
  const el = document.createElement("latex-js");
  el.setAttribute("hyphenate", "false");
  el.textContent = ${encodedBody};
  document.body.appendChild(el);
<\/script>
</body>
</html>`;
  }, [body]);

  return (
    <div className="flex flex-1 overflow-hidden divide-x divide-black/10 dark:divide-white/10">
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter LaTeX…"
        className="flex-1 p-4 resize-none bg-white dark:bg-black text-sm font-mono outline-none"
      />
      <iframe
        ref={iframeRef}
        className="flex-1 bg-white"
        title="LaTeX preview"
      />
    </div>
  );
}
