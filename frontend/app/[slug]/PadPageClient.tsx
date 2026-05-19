"use client";

import { PadEditor } from "./PadEditor";

function slugFromPath(): string {
  const slug = window.location.pathname.slice(1);
  return slug || "_";
}

export function PadPageClient() {
  return <PadEditor slug={slugFromPath()} />;
}
