# dopad — System Architecture

## System Overview

```
Browser
  │
  ▼
Next.js frontend (port 3000)
  │  All API calls via apiFetch (injects Bearer JWT)
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
| API client | `app/_lib/api.ts` — `apiFetch` injects `Authorization: Bearer <jwt>` |
| Auth state | `sessionStorage["session_token"]` (JWT string) |
| Package manager | pnpm |

Directory structure:
```
app/
├── _components/
│   └── login.tsx      # SIWE wallet login flow
├── _lib/
│   └── api.ts         # apiFetch wrapper
├── layout.tsx         # Root layout (Geist font, dark mode)
├── page.tsx           # Home page
└── globals.css        # Tailwind theme + CSS variables
```

### Backend (`backend/`)

| Attribute | Value |
|-----------|-------|
| Language | Go 1.21 |
| HTTP | `net/http` stdlib |
| Auth | SIWE (`spruceid/siwe-go`) + JWT (`golang-jwt/jwt/v5`) |
| Nonce store | In-memory `map[string]nonceEntry` guarded by `sync.Mutex`, swept every minute |
| Nonce TTL | 5 minutes |
| JWT TTL | 24 hours |
| CORS | Hardcoded to `http://localhost:3000` |

---

## Auth Flow (SIWE)

```
GET  /auth/nonce?address=0x...  → { nonce }
POST /auth/verify { message, signature }  → { address, token }
GET  /auth/me  [Bearer token]  → { address }
POST /auth/logout  → { ok }
```

Sequence:
1. Frontend requests a nonce for the connected wallet address
2. Frontend constructs a SIWE message (domain, chain ID, nonce, expiry) and asks the wallet to sign it
3. Backend verifies the signature against the stored nonce; if valid, issues a JWT and deletes the nonce
4. JWT is stored in `sessionStorage` and sent as a Bearer token on subsequent requests

---

## Environment Variables

| Variable | Service | Default |
|----------|---------|---------|
| `JWT_SECRET` | Backend | `dev-secret-change-in-prod` |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8080` |
