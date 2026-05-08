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
