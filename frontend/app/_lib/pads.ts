import { apiFetch } from "./api";
import type { DeriverId } from "./crypto";

export type PadData = {
  content: string;
  encrypted: boolean;
  verifyBlob: string;
  deriverId: DeriverId | "";
};

export async function getPad(slug: string): Promise<PadData | null> {
  const res = await apiFetch(`/pads/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("failed to get pad");
  const body = (await res.json()) as {
    content: string;
    encrypted: boolean;
    verify_blob: string;
    deriver_id: string;
  };
  return {
    content: body.content,
    encrypted: body.encrypted,
    verifyBlob: body.verify_blob,
    deriverId: (body.deriver_id ?? "") as DeriverId | "",
  };
}

export async function setPad(slug: string, data: PadData): Promise<void> {
  const res = await apiFetch(`/pads/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: data.content,
      encrypted: data.encrypted,
      verify_blob: data.verifyBlob,
      deriver_id: data.deriverId,
    }),
  });
  if (res.status === 429) throw new Error("rate limit exceeded");
  if (!res.ok) throw new Error("failed to save pad");
}
