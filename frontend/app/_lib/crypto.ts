import { sha3_256 } from "@noble/hashes/sha3.js";

export async function deriveKey(password: string): Promise<CryptoKey> {
  const keyBytes = sha3_256(new TextEncoder().encode(password));
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Returns base64( salt[16] || iv[12] || AES-GCM("dopad-verified:" + hex(salt)) )
// iv is a random 12-byte nonce required by AES-GCM; prepended to ciphertext so decryption can recover it
export async function makeVerifyBlob(key: CryptoKey): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode("dopad-verified:" + saltHex),
    ),
  );
  return toBase64(concat(salt, iv, ct));
}

// Returns true only when the key produces the correct sentinel after decryption
export async function checkVerifyBlob(
  key: CryptoKey,
  blob: string,
): Promise<boolean> {
  try {
    const bytes = fromBase64(blob);
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ct = bytes.slice(28);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt) === "dopad-verified:" + bytesToHex(salt);
  } catch {
    return false;
  }
}

// Returns base64( iv[12] || AES-GCM(plaintext) )
// A fresh random iv is generated per encryption call so ciphertexts are unique
export async function encryptText(
  key: CryptoKey,
  plaintext: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  return toBase64(concat(iv, ct));
}

export async function decryptText(
  key: CryptoKey,
  ciphertext: string,
): Promise<string> {
  const bytes = fromBase64(ciphertext);
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ─── Key Derivation Abstraction ──────────────────────────────────────────────
// Add new derivers to the keyDerivers registry below.

// Canonical deriver IDs — must match Go's encryption.Deriver constants in backend/encryption/deriver.go.
export const DERIVER_PASSWORD = "password" as const;
export const DERIVER_SIWE    = "siwe"     as const;
export type DeriverId = typeof DERIVER_PASSWORD | typeof DERIVER_SIWE;

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface KeyDeriver {
  readonly id: string;
  readonly label: string;
  deriveKey(ctx: { slug: string }): Promise<CryptoKey>;
}

// Returns a KeyDeriver bound to a specific password. The registry sentinel for
// "password" is display-only; always use this factory to get a callable instance.
export function getPasswordDeriver(password: string): KeyDeriver {
  return {
    id: DERIVER_PASSWORD,
    label: "Password",
    deriveKey: async (_ctx: { slug: string }) => deriveKey(password),
  };
}

// Signs a deterministic per-pad message with the browser wallet and hashes the
// signature into an AES-GCM key. Entirely client-side — no backend involvement.
class SIWEKeyDeriver implements KeyDeriver {
  readonly id = DERIVER_SIWE;
  readonly label = "Wallet (SIWE)";

  async deriveKey(ctx: { slug: string }): Promise<CryptoKey> {
    const { ethers } = await import("ethers");
    if (!window.ethereum) {
      throw new Error("No browser wallet found. Install MetaMask.");
    }
    const provider = new ethers.BrowserProvider(
      window.ethereum as Eip1193Provider,
    );
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const message = `dopad encrypt: ${ctx.slug}\nWallet: ${address}`;
    const signature = await signer.signMessage(message);
    const keyBytes = sha3_256(new TextEncoder().encode(signature));
    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }
}

// Registry of available key derivers. Extend this array to add new methods.
// The "password" sentinel is display-only; use getPasswordDeriver() to derive.
export const keyDerivers: readonly KeyDeriver[] = [
  {
    id: DERIVER_PASSWORD,
    label: "Password",
    deriveKey: async () => {
      throw new Error("Use getPasswordDeriver(password) instead.");
    },
  },
  new SIWEKeyDeriver(),
];

export function getDeriver(id: string): KeyDeriver | undefined {
  return keyDerivers.find((d) => d.id === id);
}
