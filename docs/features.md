# dopad — Features

## Core Concept

dopad is an online instant file sharer. Any URL path is a "pad" — visit `dopad.io/anything` to read or write content. No login required for basic use. Inspired by dontpad.com.

---

## Implemented Features

### Authentication
- **SIWE (Sign-In with Ethereum)** — wallet-based login via MetaMask or any EIP-1193 provider
  - Nonce-based challenge/response flow (5-minute nonce TTL)
  - JWT session token (24-hour TTL) stored in `sessionStorage`
  - Logout clears session on client; server is stateless

### Frontend
- Wallet connection via `ethers.js` v6
- SIWE message construction and signing via `siwe` v3
- Connected address display
- Bearer token injection on all API calls via `apiFetch`

---

## Differentiators (target)

- **End-to-end encryption** — content encrypted in browser before upload; server stores ciphertext only
- **Multiple login alternatives** — SIWE (done), email/password, OAuth Google
- **Premium tier** — unlimited TTL, larger file size limits, local LLM file analysis
