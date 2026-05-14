"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  checkVerifyBlob,
  decryptText,
  DERIVER_PASSWORD,
  DERIVER_SIWE,
  encryptText,
  getDeriver,
  getPasswordDeriver,
  keyDerivers,
  makeVerifyBlob,
} from "@/app/_lib/crypto";
import type { DeriverId } from "@/app/_lib/crypto";
import { getPad, setPad } from "@/app/_lib/pads";

type SaveState = "idle" | "saving" | "saved" | "rate-limited";
type PadState = "loading" | "locked" | "unlocked";

export function PadEditor({ slug }: { slug: string }) {
  const [padState, setPadState] = useState<PadState>("loading");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [verifyBlob, setVerifyBlob] = useState("");
  const [deriverId, setDeriverId] = useState<DeriverId | "">("");
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Locked state
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<DeriverId>(DERIVER_PASSWORD);

  // Encrypt / change-key form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formMethod, setFormMethod] = useState<DeriverId>(DERIVER_PASSWORD);
  const [formPassword, setFormPassword] = useState("");
  const [formConfirm, setFormConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    getPad(slug).then((pad) => {
      if (pad === null) {
        setPadState("unlocked");
        return;
      }
      setIsEncrypted(pad.encrypted);
      setVerifyBlob(pad.verifyBlob);
      if (pad.encrypted) {
        setContent(pad.content);
        setDeriverId(pad.deriverId);
        // Auto-select the method that was used to encrypt this pad
        if (pad.deriverId && keyDerivers.some((d) => d.id === pad.deriverId)) {
          setSelectedMethod(pad.deriverId as DeriverId);
        }
        setPadState("locked");
      } else {
        setContent(pad.content);
        setPadState("unlocked");
      }
    });
  }, [slug]);

  async function handlePasswordUnlock(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setUnlockError("");
    setUnlocking(true);
    try {
      const key = await getPasswordDeriver(unlockPassword).deriveKey({ slug });
      const valid = await checkVerifyBlob(key, verifyBlob);
      if (!valid) {
        setUnlockError("Wrong password. Try again.");
        return;
      }
      const plaintext = await decryptText(key, content);
      encryptionKeyRef.current = key;
      setContent(plaintext);
      setPadState("unlocked");
      setUnlockPassword("");
    } catch {
      setUnlockError("Decryption failed. Wrong password?");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleSIWEUnlock() {
    setUnlockError("");
    setUnlocking(true);
    try {
      const deriver = getDeriver(DERIVER_SIWE)!;
      const key = await deriver.deriveKey({ slug });
      const valid = await checkVerifyBlob(key, verifyBlob);
      if (!valid) {
        setUnlockError("Wrong wallet or pad. Try again.");
        return;
      }
      const plaintext = await decryptText(key, content);
      encryptionKeyRef.current = key;
      setContent(plaintext);
      setPadState("unlocked");
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Wallet unlock failed.");
    } finally {
      setUnlocking(false);
    }
  }

  function handleChange(value: string) {
    setContent(value);
    setSaveState("idle");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const key = encryptionKeyRef.current;
        if (key) {
          const cipher = await encryptText(key, value);
          await setPad(slug, { content: cipher, encrypted: true, verifyBlob, deriverId });
        } else {
          await setPad(slug, { content: value, encrypted: false, verifyBlob: "", deriverId: "" });
        }
        setSaveState("saved");
      } catch (err) {
        if (err instanceof Error && err.message === "rate limit exceeded") {
          setSaveState("rate-limited");
        } else {
          setSaveState("idle");
        }
      }
    }, 800);
  }

  async function handlePasswordFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    clearTimeout(timerRef.current);
    setFormError("");
    if (formPassword !== formConfirm) {
      setFormError("Passwords don't match.");
      return;
    }
    if (formPassword.length === 0) {
      setFormError("Password cannot be empty.");
      return;
    }
    setFormSaving(true);
    try {
      const key = await getPasswordDeriver(formPassword).deriveKey({ slug });
      const blob = await makeVerifyBlob(key);
      const cipher = await encryptText(key, content);
      await setPad(slug, { content: cipher, encrypted: true, verifyBlob: blob, deriverId: DERIVER_PASSWORD });
      encryptionKeyRef.current = key;
      setVerifyBlob(blob);
      setDeriverId(DERIVER_PASSWORD);
      setIsEncrypted(true);
      setShowPasswordForm(false);
      setFormPassword("");
      setFormConfirm("");
      setSaveState("saved");
    } catch {
      setFormError("Failed to encrypt. Try again.");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleSIWEFormEncrypt() {
    clearTimeout(timerRef.current);
    setFormError("");
    setFormSaving(true);
    try {
      const deriver = getDeriver(DERIVER_SIWE)!;
      const key = await deriver.deriveKey({ slug });
      const blob = await makeVerifyBlob(key);
      const cipher = await encryptText(key, content);
      await setPad(slug, { content: cipher, encrypted: true, verifyBlob: blob, deriverId: DERIVER_SIWE });
      encryptionKeyRef.current = key;
      setVerifyBlob(blob);
      setDeriverId(DERIVER_SIWE);
      setIsEncrypted(true);
      setShowPasswordForm(false);
      setSaveState("saved");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Wallet encryption failed.");
    } finally {
      setFormSaving(false);
    }
  }

  function cancelEncryptForm() {
    setShowPasswordForm(false);
    setFormMethod(DERIVER_PASSWORD);
    setFormPassword("");
    setFormConfirm("");
    setFormError("");
  }

  if (padState === "loading") {
    return (
      <div className="flex flex-col flex-1 min-h-screen items-center justify-center">
        <span className="text-sm text-zinc-400">Loading…</span>
      </div>
    );
  }

  if (padState === "locked") {
    return (
      <div className="flex flex-col flex-1 min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            dopad
          </Link>
          <span className="font-mono text-sm text-zinc-500">/{slug}</span>
        </header>
        <div className="flex flex-col flex-1 items-center justify-center gap-4 p-8">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-sm font-semibold">This pad is encrypted</span>
            <span className="text-xs text-zinc-400">Choose a method to unlock it</span>
          </div>

          {/* Method picker tabs */}
          <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded">
            {keyDerivers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(d.id as DeriverId);
                  setUnlockError("");
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedMethod === d.id
                    ? "bg-black dark:bg-white text-white dark:text-black font-medium"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {selectedMethod === DERIVER_PASSWORD && (
            <form
              onSubmit={handlePasswordUnlock}
              className="flex flex-col gap-2 w-full max-w-xs"
            >
              <input
                type="password"
                autoFocus
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Password"
                className="border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-transparent outline-none focus:border-black dark:focus:border-white"
              />
              {unlockError && (
                <span className="text-xs text-red-500">{unlockError}</span>
              )}
              <button
                type="submit"
                disabled={unlocking}
                className="px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded disabled:opacity-50"
              >
                {unlocking ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          )}

          {selectedMethod === DERIVER_SIWE && (
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {unlockError && (
                <span className="text-xs text-red-500 text-center">{unlockError}</span>
              )}
              <button
                type="button"
                disabled={unlocking}
                onClick={handleSIWEUnlock}
                className="px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded disabled:opacity-50"
              >
                {unlocking ? "Connecting…" : "Connect Wallet & Unlock"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          dopad
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-zinc-500">/{slug}</span>
          <span className="text-xs text-zinc-400">
            {saveState === "saving" && "saving…"}
            {saveState === "saved" && "saved"}
            {saveState === "rate-limited" && (
              <span className="text-amber-500">slow down — rate limited</span>
            )}
          </span>
          {showPasswordForm ? (
            <div className="flex items-center gap-2">
              {/* Method picker tabs (inline) */}
              <div className="flex gap-1 p-0.5 bg-black/5 dark:bg-white/5 rounded">
                {keyDerivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setFormMethod(d.id as DeriverId);
                      setFormError("");
                    }}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      formMethod === d.id
                        ? "bg-black dark:bg-white text-white dark:text-black font-medium"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {formMethod === DERIVER_PASSWORD && (
                <form
                  onSubmit={handlePasswordFormSubmit}
                  className="flex items-center gap-2"
                >
                  <input
                    type="password"
                    autoFocus
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="New password"
                    className="border border-black/20 dark:border-white/20 rounded px-2 py-1 text-xs bg-transparent outline-none focus:border-black dark:focus:border-white w-32"
                  />
                  <input
                    type="password"
                    value={formConfirm}
                    onChange={(e) => setFormConfirm(e.target.value)}
                    placeholder="Confirm"
                    className="border border-black/20 dark:border-white/20 rounded px-2 py-1 text-xs bg-transparent outline-none focus:border-black dark:focus:border-white w-24"
                  />
                  {formError && (
                    <span className="text-xs text-red-500">{formError}</span>
                  )}
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="px-2 py-1 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded disabled:opacity-50"
                  >
                    {formSaving ? "Saving…" : "Confirm"}
                  </button>
                </form>
              )}

              {formMethod === DERIVER_SIWE && (
                <div className="flex items-center gap-2">
                  {formError && (
                    <span className="text-xs text-red-500">{formError}</span>
                  )}
                  <button
                    type="button"
                    disabled={formSaving}
                    onClick={handleSIWEFormEncrypt}
                    className="px-2 py-1 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded disabled:opacity-50"
                  >
                    {formSaving ? "Signing…" : "Sign with Wallet"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={cancelEncryptForm}
                className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-2 py-1 text-xs font-medium border border-black/20 dark:border-white/20 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              {isEncrypted ? "Change key" : "Encrypt"}
            </button>
          )}
        </div>
      </header>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start writing…"
        className="flex-1 w-full p-4 resize-none bg-white dark:bg-black text-sm font-mono outline-none"
      />
    </div>
  );
}
