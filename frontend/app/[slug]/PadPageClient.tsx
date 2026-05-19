"use client";

import { useEffect, useState } from "react";
import { PadEditor } from "./PadEditor";

export function PadPageClient() {
  const [slug, setSlug] = useState<string>("_");

  useEffect(() => {
    setSlug(window.location.pathname.slice(1) || "_");
  }, []);

  return <PadEditor slug={slug} />;
}
