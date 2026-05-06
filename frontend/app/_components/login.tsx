"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { apiFetch } from "../_lib/api";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

export default function Login() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("No browser wallet found. Install MetaMask.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      const nonceRes = await apiFetch(`/auth/nonce?address=${addr}`);
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { nonce } = await nonceRes.json();

      const network = await provider.getNetwork();
      const message = new SiweMessage({
        domain: window.location.host,
        address: addr,
        statement: "Sign in to no-trust-cms",
        uri: window.location.origin,
        version: "1",
        chainId: Number(network.chainId),
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }).prepareMessage();

      const signature = await signer.signMessage(message);

      const verifyRes = await apiFetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Verification failed");
      }

      const { address: verified } = await verifyRes.json();
      setAddress(verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setAddress(null);
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl p-6 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-950">
      <h2 className="text-xl font-semibold">Sign in with Ethereum</h2>

      {address ? (
        <>
          <div className="text-xs">
            <span className="font-semibold">Signed in as </span>
            <span className="font-mono break-all">{address}</span>
          </div>
          <button
            onClick={handleLogout}
            className="h-10 rounded-full border border-black/10 dark:border-white/15 px-4 text-sm font-medium"
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={handleLogin}
          disabled={loading}
          className="h-10 rounded-full bg-foreground text-background px-4 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Connect wallet & sign in"}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 break-all">{error}</div>
      )}
    </div>
  );
}
