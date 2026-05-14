# dopad — Features

## Core Concept

dopad is an online instant file sharer. Any URL path is a "pad" — visit `dopad.io/anything` to read or write content. No login required. Inspired by dontpad.com.

---

## Implemented Features

### End-to-End Encryption
- **AES-GCM-256** — content encrypted in browser before upload; server stores ciphertext only
- **Password-based key** — SHA3-256(password) → AES key; password never sent to server
- **Wallet-based key (SIWE)** — `personal_sign` of deterministic per-pad message → SHA3-256(signature) → AES key; re-derivable with the same wallet anytime
- **Verify blob** — encrypted sentinel stored alongside ciphertext; used to validate the key without server-side plaintext
- **Extensible `KeyDeriver` interface** — new methods (Google Auth, Microsoft, etc.) added by implementing the interface and registering in `keyDerivers`

### Pad Editor
- Auto-save with 800 ms debounce
- Rate-limit feedback (429 → amber warning in header)
- Method picker UI on lock screen and encrypt form
- Key held in React ref; autosave re-encrypts on every edit

---

## Differentiators (target)

- **Multiple key derivation methods** — password (done), SIWE wallet (done), OAuth Google, Microsoft (planned)
- **Premium tier** — unlimited TTL, larger file size limits, local LLM file analysis
