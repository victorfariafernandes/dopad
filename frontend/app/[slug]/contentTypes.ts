export type ContentType = "text" | "rich-text" | "latex" | "code";
export type Language = "javascript" | "c" | "python";

export const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "rich-text", label: "Rich Text" },
  { id: "latex", label: "LaTeX" },
  { id: "code", label: "Code" },
];

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "c", label: "C" },
  { id: "python", label: "Python" },
];

export type PadContentEnvelope = {
  type: ContentType;
  lang?: Language;
  body: string;
};

export function parseContent(raw: string): PadContentEnvelope {
  return JSON.parse(raw) as PadContentEnvelope;
}

export function serializeContent(envelope: PadContentEnvelope): string {
  return JSON.stringify(envelope);
}
