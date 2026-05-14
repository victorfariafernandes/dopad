# Changelog

This file is maintained by AI agents. Every time an agent makes any change to the codebase — files added, modified, or deleted — it must append an entry here before ending the session. No exceptions, even for small changes.

## Entry format

```
## YYYY-MM-DD — <short summary>

**Agent:** <model name and session context>
**Files changed:** <list of files>

**What changed:**
- <bullet: added / modified / deleted X>

**Why:** <the user's intent or task that triggered this change>
```

---

## 2026-05-14 — Store deriver_id on pads; auto-select unlock method on locked pad screen

**Agent:** claude-sonnet-4-6
**Files changed:**
- `backend/encryption/deriver.go` — new file; `Deriver` string type with `DeriverPassword = "password"` and `DeriverSIWE = "siwe"` constants
- `backend/adapters/store/pad.go` — added `DeriverId encryption.Deriver` field to `Pad` struct
- `backend/adapters/http/pad.go` — added `deriver_id` to PUT request body and to `padResponse` (returned by both GET and PUT)
- `frontend/app/_lib/crypto.ts` — exported `DERIVER_PASSWORD`, `DERIVER_SIWE` constants and `DeriverId` type; updated registry and class to use them
- `frontend/app/_lib/pads.ts` — added `deriverId: DeriverId | ""` to `PadData`; maps `deriver_id` ↔ `deriverId` in GET/PUT
- `frontend/app/[slug]/PadEditor.tsx` — added `deriverId` state; `useEffect` reads `pad.deriverId` and auto-sets `selectedMethod` on locked pads; all `setPad` calls include `deriverId`

**Why:** When a user returned to a pad they encrypted with a wallet (SIWE), the lock screen defaulted to the Password tab, forcing a manual tab switch. Persisting `deriver_id` and using it to initialize `selectedMethod` fixes the UX.

---

## 2026-05-14 — Remove SIWE auth + add extensible KeyDeriver abstraction for pad encryption

**Agent:** claude-sonnet-4-6
**Files changed:**
- `backend/adapters/store/nonce.go` — deleted
- `backend/services/auth/service.go` — deleted (entire `services/auth/` directory removed)
- `backend/adapters/http/auth.go` — deleted
- `backend/adapters/http/pad.go` — moved `writeJSON` helper here (was in auth.go)
- `backend/main.go` — removed auth wiring, nonce store, JWT secret, sweep goroutine
- `backend/middlewares/cors.go` — removed `Authorization` from allowed headers; removed `POST` from allowed methods
- `backend/go.mod` / `backend/go.sum` — removed `golang-jwt/jwt`, `spruceid/siwe-go`, and all transitive deps
- `frontend/app/_components/login.tsx` — deleted
- `frontend/app/_lib/api.ts` — removed `SESSION_KEY` export and Bearer token injection
- `frontend/app/_lib/crypto.ts` — appended `KeyDeriver` interface, `getPasswordDeriver` factory, `SIWEKeyDeriver` class, `keyDerivers` registry, `getDeriver`
- `frontend/app/[slug]/PadEditor.tsx` — added method picker tabs (Password / Wallet SIWE) on lock screen and encrypt form; `handleSIWEUnlock`, `handleSIWEFormEncrypt`
- `frontend/package.json` / `frontend/pnpm-lock.yaml` — removed `siwe` npm package
- `docs/architecture.md` — removed Auth Flow section; updated component tables; added Key Derivation section
- `docs/api-spec.md` — removed all `/auth/*` endpoints; updated CORS conventions
- `docs/features.md` — replaced Authentication section with Encryption section listing both derivers

**Why:** The SIWE authentication flow (wallet login → JWT) is no longer needed. The nonce store, which backed that flow, was dead code. SIWE wallet signing is repurposed as a client-side encryption key derivation method alongside password-based derivation. A `KeyDeriver` interface and registry make it straightforward to add more methods (Google Auth, Microsoft Auth, etc.) in the future.

---

## 2026-05-14 — Fix: encrypted pad shows ciphertext on reload instead of password prompt

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `frontend/app/[slug]/PadEditor.tsx` (modified)

**What changed:**
- Added `clearTimeout(timerRef.current)` at the top of `handlePasswordFormSubmit` to cancel any pending auto-save debounce timer before the encryption save begins

**Why:** Race condition — a debounce timer set while the user was typing could fire while the encryption `setPad` call was in-flight. If that auto-save network request resolved after the encryption save, it would overwrite the backend with `{encrypted: false}`, causing the ciphertext to be shown in the textarea on the next reload instead of the password-unlock overlay.

---

## 2026-05-14 — Add password-based pad encryption (AES-GCM-256 + SHA3-256)

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `backend/adapters/store/pad.go` (modified)
- `backend/services/pad/service.go` (modified)
- `backend/adapters/http/pad.go` (modified)
- `frontend/app/_lib/crypto.ts` (added)
- `frontend/app/_lib/pads.ts` (modified)
- `frontend/app/[slug]/PadEditor.tsx` (modified)
- `frontend/package.json` (modified — added `@noble/hashes`)

**What changed:**
- Backend `Pad` struct extended with `Encrypted bool` and `VerifyBlob string`; `PadStore` interface and `MemoryPadStore` updated accordingly
- `pad.Service.Get/Set` now operate on `store.Pad` instead of plain strings
- HTTP `GET /pads/{slug}` response now includes `encrypted` and `verify_blob` fields; `PUT` body accepts the same
- New `frontend/app/_lib/crypto.ts`: `deriveKey` (SHA3-256 password → AES-GCM-256 key), `encryptText`/`decryptText` (AES-GCM, base64 IV+ciphertext), `makeVerifyBlob`/`checkVerifyBlob` (sentinel + salt approach for cheap wrong-key detection)
- `pads.ts` updated: new `PadData` type, `getPad` returns `PadData | null`, `setPad` accepts `PadData` with encryption fields
- `PadEditor.tsx` rewritten with `loading → locked → unlocked` state machine: password overlay for locked pads, "Encrypt" button for unencrypted pads, "Change password" button for already-encrypted pads; auto-save re-encrypts with the session key held in memory

**Why:** Implement client-side end-to-end encryption so the server never sees plaintext pad content.

---

## 2026-05-08 — Fix review-docs errors and warnings

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `backend/adapters/http/pad.go` (modified)
- `backend/middlewares/ratelimit.go` (modified)
- `frontend/app/[slug]/PadEditor.tsx` (modified)
- `docs/architecture.md` (modified)
- `docs/code-style.md` (modified)

**What changed:**
- `pad.go`: replaced `_ = h.svc.Set(...)` with proper error handling — logs and returns 500 on failure
- `pad.go`: added missing `"log"` import
- `ratelimit.go`: acknowledged `w.Write` return value with `_, _ =`
- `PadEditor.tsx`: replaced `<a href="/">` with `<Link href="/">` from `next/link` (ESLint no-html-link-for-pages)
- `architecture.md`: updated frontend tree (`Login.tsx`, added `pads.ts`, `[slug]/` route) and backend tree (added pad service/store/handler, rate limiter; removed deleted `ports.go`)
- `code-style.md`: updated Go handler CORS rule to reflect middleware composition pattern instead of old `cors(w, r)` call-per-handler pattern

**Why:** Fixes flagged by `/review-docs` — 2 errors and 4 warnings.

---

## 2026-05-08 — Wire frontend to backend + add Cypress E2E tests

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `frontend/app/_lib/pads.ts` (rewritten)
- `frontend/app/[slug]/PadEditor.tsx` (modified)
- `frontend/cypress.config.ts` (added)
- `frontend/cypress/e2e/pad.cy.ts` (added)
- `frontend/package.json` (cypress devDependency added)

**What changed:**
- Replaced `localStorage` mock in `pads.ts` with real `apiFetch` calls to `GET /pads/{slug}` and `PUT /pads/{slug}`; 404 returns empty string, 429 throws a typed error
- Added `"rate-limited"` save state to `PadEditor`; catches 429 from `setPad` and shows amber "slow down — rate limited" message in header
- Added `cypress.config.ts` pointing to `http://localhost:3000`
- Added three-tab Cypress E2E flow: Tab 1 creates a pad via home page, Tab 2 reads it back in a fresh page load, Tab 3 edits it and verifies persistence

**Why:** User requested frontend–backend integration and Cypress E2E orchestration for the create → read → edit pad flow.

---

## 2026-05-08 — Add pad GET/PUT routes with per-IP rate limiting

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `backend/adapters/store/pad.go` (added)
- `backend/services/pad/service.go` (added)
- `backend/adapters/http/pad.go` (added)
- `backend/middlewares/ratelimit.go` (added)
- `backend/middlewares/cors.go` (modified)
- `backend/main.go` (modified)
- `docs/api-spec.md` (modified)

**What changed:**
- Added `PadStore` interface + `MemoryPadStore` (RWMutex, interface-ready for Postgres swap)
- Added `pad.Service` with `Get` (returns `ErrNotFound`) and `Set` methods
- Added `PadHandler`: `GET /pads/{slug}` and `PUT /pads/{slug}`; CORS on all methods, rate limiter on PUT only
- Added token-bucket per-IP rate limiter middleware (10 writes/min); reads `X-Forwarded-For` for proxied requests
- Updated CORS allowed methods to include `PUT`
- Wired pad layer into `main.go` alongside the existing auth handler
- Added pad endpoints to `docs/api-spec.md`

**Why:** User requested backend pad storage routes with a throttle strategy for writes, and api-spec update.

---

## 2026-05-08 — Add home page slug input and pad edit page

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `frontend/app/page.tsx` (rewritten)
- `frontend/app/[slug]/page.tsx` (added)
- `frontend/app/[slug]/PadEditor.tsx` (added)
- `frontend/app/_lib/pads.ts` (added)

**What changed:**
- Replaced home page (SIWE login) with a slug input form — user types a pad name and is redirected to `/{slug}`
- Added dynamic route `app/[slug]/page.tsx` — server component shell that awaits `params` and renders the editor
- Added `PadEditor.tsx` — full-height textarea with 800ms debounce auto-save and save status indicator in header
- Added `_lib/pads.ts` — mocked pad store using `localStorage`; async signatures so API call sites won't need to change when the real backend is wired in

**Why:** User requested the two core product pages: home (navigate to a pad) and edit (read/write pad content), with all backend calls mocked.

---

## 2026-05-08 — Move NonceStore interface to adapters/store

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `backend/services/auth/ports.go` (deleted)
- `backend/adapters/store/nonce.go` (modified)
- `backend/services/auth/service.go` (modified)

**What changed:**
- Deleted `ports.go` — interface no longer lives in the service layer
- Added `NonceStore` interface to `adapters/store/nonce.go`, co-located with its implementation
- Updated `service.go` to import `adapters/store` and reference `store.NonceStore`

**Why:** User preference — the interface should be close to the adapter that implements it, not in the service package.

---

## 2026-05-08 — Refactor Go backend into services / adapters / middlewares

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `backend/main.go` (rewritten)
- `backend/services/auth/ports.go` (added)
- `backend/services/auth/service.go` (added)
- `backend/adapters/store/nonce.go` (added)
- `backend/adapters/http/auth.go` (added)
- `backend/middlewares/cors.go` (added)
- `docs/architecture.md` (updated backend section)

**What changed:**
- Split single `main.go` into a layered architecture: services, adapters (inward HTTP + outward store), and middlewares
- `services/auth` holds all business logic (nonce generation, SIWE verification, JWT issuance/validation) behind a `NonceStore` interface
- `adapters/store` provides `MemoryNonceStore` implementing that interface; `GetAndDelete` is atomic to prevent nonce replay
- `adapters/http` provides thin HTTP handlers that decode requests, call the service, and encode responses; uses sentinel errors (`ErrInvalidSIWEMessage`, `ErrSignatureInvalid`, `ErrNonceExpired`) for precise status codes
- `middlewares/cors` is now a standard `func(HandlerFunc) HandlerFunc` wrapper instead of a boolean helper
- `main.go` is now a pure wiring file: instantiate store → inject into service → register handlers with middleware
- Updated `docs/architecture.md` to document the new directory structure and layer responsibilities

**Why:** User requested an architectural refactor separating the codebase into services (business logic), adapters (inward HTTP + outward store), and pluggable middlewares.

---

## 2026-05-08 — Fix code style violations found by /review-docs

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `frontend/app/_components/login.tsx` → renamed to `Login.tsx`
- `frontend/app/_components/Login.tsx` (modified)
- `frontend/app/page.tsx` (modified)

**What changed:**
- Renamed `login.tsx` to `Login.tsx` to match the PascalCase component naming convention
- Changed `Login` from `export default` to named `export function Login` (non-page components must use named exports)
- Updated import in `page.tsx` from default to named: `import { Login } from "./_components/Login"`
- Updated SIWE statement from `"Sign in to no-trust-cms"` to `"Sign in to dopad"`

**Why:** Errors flagged by `/review-docs` spec review — component filename, export style, and branding string all violated `docs/code-style.md`.

---

## 2026-05-08 — Initial AI playbook and project documentation

**Agent:** Claude Sonnet 4.6
**Files changed:**
- `docs/architecture.md` (added)
- `docs/api-spec.md` (added)
- `docs/features.md` (added)
- `docs/code-style.md` (added)
- `CHANGELOG.md` (added)
- `CLAUDE.md` (added)
- `.claude/skills/review-docs.md` (added)
- `.claude/skills/test.md` (added)

**What changed:**
- Added `docs/` folder with architecture overview, API spec (current endpoints only), feature list, and code style rules for Go and TypeScript
- Added root `CLAUDE.md` as the AI playbook with project context, dev commands, conventions, and the changelog rule
- Added `CHANGELOG.md` (this file) to track all agent-made changes
- Added `.claude/skills/review-docs.md` — skill that reads `docs/` and reviews changed files against the specs
- Added `.claude/skills/test.md` — skill that runs Go tests, frontend tests, and Cypress E2E integration tests

**Why:** User requested an AI playbook documenting the dopad project architecture, plus a code review skill and a test run skill.
