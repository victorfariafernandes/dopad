# dopad — System Architecture

## System Overview

```
Browser
  │
  ▼
Next.js frontend (port 3000)
  │  All API calls via apiFetch
  ▼
Go HTTP backend (port 8080)
```

Guiding principle: **zero-trust storage**. Encryption and decryption happen on the client. The server never sees plaintext.

---

## Components

### Frontend (`frontend/`)

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (CSS-first config in `globals.css`) |
| API client | `app/_lib/api.ts` — `apiFetch` wrapper (no auth headers) |
| Package manager | pnpm |

Directory structure:
```
app/
├── _lib/
│   ├── api.ts         # apiFetch wrapper
│   ├── crypto.ts      # AES-GCM encryption + KeyDeriver abstraction
│   └── pads.ts        # getPad / setPad (calls GET+PUT /pads/{slug})
├── [slug]/
│   ├── page.tsx       # Pad page shell (server component)
│   └── PadEditor.tsx  # Pad editor (client component, auto-save, 429 handling)
├── layout.tsx         # Root layout (Geist font, dark mode)
├── page.tsx           # Home page (slug input → redirect)
└── globals.css        # Tailwind theme + CSS variables
```

### Backend (`backend/`)

| Attribute | Value |
|-----------|-------|
| Language | Go 1.21 |
| HTTP | `net/http` stdlib |
| CORS | Hardcoded to `http://localhost:3000` |
| Rate limit | 10 writes/min per IP (token bucket, `middlewares/ratelimit.go`) |

Directory structure (layered architecture):
```
backend/
├── main.go                     # Wires layers: adapters → service → HTTP router
├── services/
│   └── pad/
│       └── service.go          # Business logic: pad get/set, ErrNotFound sentinel
├── adapters/
│   ├── http/
│   │   └── pad.go              # Inward adapter: GET+PUT /pads/{slug} handlers
│   └── store/
│       └── pad.go              # Outward adapter: in-memory PadStore (RWMutex)
└── middlewares/
    ├── cors.go                 # CORS middleware wrapper (plugged via Register)
    └── ratelimit.go            # Token-bucket per-IP rate limiter
```

Layer responsibilities:
- **Services** — pure business logic, no HTTP or storage details
- **Adapters (inward)** — HTTP handlers; decode requests, call service, encode responses
- **Adapters (outward)** — implement service interfaces; currently in-memory, swappable for Redis/DB
- **Middlewares** — reusable `func(http.HandlerFunc) http.HandlerFunc` wrappers plugged at registration

---

## Key Derivation

Pad encryption uses a `KeyDeriver` abstraction (`app/_lib/crypto.ts`). The derived `CryptoKey` is held in a React ref and used for all encrypt/decrypt operations — it never leaves the browser.

```typescript
interface KeyDeriver {
  readonly id: string;
  readonly label: string;
  deriveKey(ctx: { slug: string }): Promise<CryptoKey>;
}
```

| Method | id | How the key is derived |
|--------|----|------------------------|
| Password | `"password"` | User-typed string → UTF-8 → SHA3-256 → AES-GCM key |
| Wallet (SIWE) | `"siwe"` | `personal_sign` of `"dopad encrypt: {slug}\nWallet: {address}"` → UTF-8(signature) → SHA3-256 → AES-GCM key |

The wallet-based method is deterministic per (slug, wallet address) pair: the same wallet always produces the same key for a given pad, with no backend involvement or nonce exchange.

Adding a new method (e.g. Google Auth) requires implementing `KeyDeriver` and appending it to the `keyDerivers` registry in `crypto.ts`.

---

## Encryption Data Flow

```
User provides key input (password or wallet signature)
        │
        ▼
KeyDeriver.deriveKey({ slug }) → CryptoKey (AES-GCM-256, in-memory only)
        │
        ▼
encryptText(key, plaintext) → base64(iv[12] || ciphertext)
makeVerifyBlob(key)         → base64(salt[16] || iv[12] || ciphertext)
        │
        ▼
PUT /pads/{slug}  { content: ciphertext, encrypted: true, verify_blob: blob }
        │
        ▼
Backend stores opaque bytes — never decrypts
```

---

## Environment Variables

| Variable | Service | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8080` |
