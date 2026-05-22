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

## 2026-05-22 — Add production deploy pipeline (workflow_dispatch with version bump)

**Agent:** claude-sonnet-4-6
**Files changed:**
- `.github/workflows/deploy.yml` — added (new manual deploy workflow)
- `infra/ansible/playbook.yml` — modified (role-level tags for selective execution)
- `infra/ansible/roles/backend/tasks/main.yml` — modified (added `recreate: true` to docker_container task)

**What changed:**
- New `Deploy to Production` GitHub Actions workflow with `workflow_dispatch` trigger
- Inputs: `version_bump` dropdown (patch/minor/major) and `release_notes` text field
- Three sequential jobs: `tag` (bumps semver, creates annotated git tag), `build` (Docker image + frontend tarball + GitHub Release), `deploy` (Ansible with `--tags backend,frontend`)
- Ansible playbook roles now have explicit tags so only backend/frontend are re-run on deploy
- Backend `docker_container` task uses `recreate: true` to always pick up newly pulled image

**Why:** No automated way to create releases or deploy to production; required manually tagging, building, and SSHing to update the server.

---

## 2026-05-21 — Replace in-memory pad store with OCI Object Storage

**Agent:** claude-sonnet-4-6
**Files changed:**
- `backend/adapters/store/oci.go` — added (OCIPadStore implementing PadStore via OCI Object Storage)
- `backend/adapters/store/pad.go` — modified (added json tags to Pad struct)
- `backend/main.go` — modified (added selectStore() — uses OCIPadStore when OCI_BUCKET_NAME+OCI_NAMESPACE set, else MemoryPadStore)
- `backend/go.mod` + `backend/go.sum` — modified (added github.com/oracle/oci-go-sdk/v65, go 1.21→1.24)
- `infra/terraform/modules/compute/main.tf` — modified (added oci_identity_dynamic_group for Instance Principal auth)
- `infra/terraform/modules/compute/variables.tf` — modified (added tenancy_ocid variable)
- `infra/terraform/modules/compute/outputs.tf` — modified (added backend_dynamic_group_name output)
- `infra/terraform/main.tf` — modified (added oci_identity_policy for bucket access, pass tenancy_ocid to compute module)
- `infra/ansible/roles/backend/templates/zeropad.env.j2` — modified (added OCI_BUCKET_NAME and OCI_NAMESPACE)
- `infra/ansible/playbook.yml` — modified (added oci_namespace var from OCI_NAMESPACE env)

**What changed:**
- Added OCIPadStore backed by `zeropad-pads` OCI Object Storage bucket; each pad stored as JSON object named by slug
- Instance Principal auth (no credentials in container) with API key env var fallback for local dev
- selectStore() in main.go picks OCI store when env vars present, falls back to memory for local dev
- Terraform provisions IAM dynamic group + policy granting the VM least-privilege access to bucket objects
- Ansible template now injects OCI_BUCKET_NAME and OCI_NAMESPACE into the backend container env

**Why:** Pads were lost on server restart; connect the already-provisioned OCI bucket to make storage persistent.

---

## 2026-05-17 — Add Terraform + Ansible IaC for OCI Always Free deployment (zeropad.dev)

**Agent:** claude-sonnet-4-6
**Files changed:**
- `backend/main.go` — modified (read `ALLOW_ORIGIN` env var, default `http://localhost:3000`)
- `backend/Dockerfile` — modified (`GOARCH=amd64` → `GOARCH=arm64` for Ampere A1 VM)
- `.github/workflows/release.yml` — modified (add `platforms: linux/arm64` to Docker build)
- `infra/terraform/.gitignore` — added
- `infra/terraform/terraform.tfvars.example` — added
- `infra/terraform/variables.tf` — added
- `infra/terraform/main.tf` — added (OCI + Cloudflare providers, image datasource)
- `infra/terraform/networking.tf` — added (VCN, IGW, route table, security list, subnet)
- `infra/terraform/storage.tf` — added (50 GB block volume, `zeropad-pads` Object Storage bucket)
- `infra/terraform/compute.tf` — added (Ampere A1 VM + block volume attachment)
- `infra/terraform/loadbalancer.tf` — added (OCI Flexible LB 10 Mbps, backend set, HTTP listener)
- `infra/terraform/cloudflare.tf` — added (A record + www CNAME for `zeropad.dev`, proxied)
- `infra/terraform/outputs.tf` — added
- `infra/ansible/inventory.ini` — added
- `infra/ansible/playbook.yml` — added
- `infra/ansible/roles/volume/tasks/main.yml` — added (format + mount block volume to /data)
- `infra/ansible/roles/docker/tasks/main.yml` — added (install Docker CE on Oracle Linux 9)
- `infra/ansible/roles/backend/tasks/main.yml` — added (pull + run dopad-backend container)
- `infra/ansible/roles/backend/templates/zeropad.env.j2` — added

**Why:** User requested IaC for OCI Always Free tier ($0/month): 1 Ampere A1 VM, OCI Flexible LB, Object Storage bucket, 50 GB block volume, Cloudflare CDN/DNS for `zeropad.dev`. Terraform provisions infrastructure; Ansible configures the server.

---

## 2026-05-14 — Add GitHub Releases CI/CD pipeline with Docker image and static frontend bundle

**Agent:** claude-sonnet-4-6
**Files changed:**
- `.github/workflows/release.yml` — added (GitHub Actions release workflow)
- `backend/Dockerfile` — added (multi-stage Go build → distroless runtime)
- `frontend/next.config.ts` — modified (added `output: "export"` for static export)
- `frontend/app/[[...slug]]/page.tsx` — added (server component with `generateStaticParams`)
- `frontend/app/[[...slug]]/PageContent.tsx` — added (client component: home + pad routing)
- `frontend/app/[[...slug]]/PadEditor.tsx` — added (moved from `app/[slug]/PadEditor.tsx`)
- `frontend/app/[[...slug]]/DeriverSelect.tsx` — added (moved from `app/[slug]/DeriverSelect.tsx`)
- `frontend/app/[slug]/page.tsx` — deleted (replaced by catch-all route)
- `frontend/app/[slug]/PadEditor.tsx` — deleted (moved to `[[...slug]]`)
- `frontend/app/[slug]/DeriverSelect.tsx` — deleted (moved to `[[...slug]]`)

**What changed:**
- Added `.github/workflows/release.yml`: on tag push matching `v*.*.*`, builds a Docker image for the backend and pushes it to `ghcr.io/{owner}/dopad-backend:{tag}` + `:latest`; builds the frontend static export and attaches `frontend-{tag}.tar.gz` to the GitHub Release
- Added `backend/Dockerfile`: two-stage build using `golang:1.21-alpine` builder and `gcr.io/distroless/static-debian12` runtime; binary compiled with `CGO_ENABLED=0 GOOS=linux` and `-ldflags="-w -s"` for a minimal, static binary
- Enabled `output: "export"` in `next.config.ts` so `pnpm build` emits a deployable `out/` directory of static HTML/CSS/JS
- Refactored routing from `app/page.tsx` + `app/[slug]/` to a single `app/[[...slug]]/` optional catch-all; `generateStaticParams` produces one template at `/_`; CDN serves `_.html` for all paths and client-side `useParams()` resolves the real slug at runtime

**Why:** User requested a GitHub Releases integration to produce versioned artifacts: a Docker image for the Go backend and a compressed static bundle for the Next.js frontend, to be deployed later to a cloud environment.

---

## 2026-05-14 — Rename Go module from no-trust-cms-backend to dopad-backend

**Agent:** claude-sonnet-4-6
**Files changed:**
- `backend/go.mod` — module declaration updated
- `backend/main.go` — 4 import paths updated
- `backend/adapters/http/pad.go` — 3 import paths updated
- `backend/adapters/store/pad.go` — 1 import path updated
- `backend/services/pad/service.go` — 1 import path updated

**Why:** Project renamed from no-trust-cms to dopad; all Go import paths must match the module name in go.mod.

---

## 2026-05-14 — Replace method-picker tabs with shared DeriverSelect dropdown; fix layout shift

**Agent:** claude-sonnet-4-6
**Files changed:**
- `frontend/app/[slug]/DeriverSelect.tsx` — new file; `DeriverSelect` component renders a `<select>` driven by `keyDerivers` registry
- `frontend/app/[slug]/PadEditor.tsx` — replaced both inline tab-button blocks (lock screen + header encrypt form) with `<DeriverSelect>`; wrapped dynamic form content in a fixed-width `w-64` / `w-72` container to prevent layout shift when switching methods

**Why:** The two-button pill tabs caused the picker to jump left/right when the user switched methods because the adjacent form (two inputs vs one button) had different widths. A `<select>` dropdown with a fixed-width slot for the form content keeps the picker pinned. Extracting a shared component eliminates duplication between the lock screen and the header encrypt form.

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

---

## 2026-05-19 — Fix window access during static prerendering

**Agent:** claude-sonnet-4-6
**Files changed:** `frontend/app/[slug]/PadPageClient.tsx`

**What changed:**
- Replaced direct `window.location.pathname` call with `useEffect` + `useState` to defer slug resolution to client-side hydration

**Why:** Next.js static export prerendered `/_` and threw `ReferenceError: window is not defined` because `window` is not available at build time.

---

## 2026-05-19 — Rebrand UI from dopad to zeropad

**Agent:** claude-sonnet-4-6
**Files changed:** `frontend/app/page.tsx`, `frontend/app/[slug]/PadEditor.tsx`

**What changed:**
- Updated h1 on home page from "dopad" to "zeropad"
- Updated both header Link labels in PadEditor from "dopad" to "zeropad"

**Why:** User requested the frontend display "zeropad" instead of "dopad". Crypto protocol constants in crypto.ts left unchanged to preserve compatibility with existing encrypted pads.

---

## 2026-05-20 — Rename crypto sentinel strings from dopad to zeropad

**Agent:** claude-sonnet-4-6
**Files changed:** `frontend/app/_lib/crypto.ts`

**What changed:**
- Renamed `"dopad-verified:"` sentinel to `"zeropad-verified:"` in `makeVerifyBlob` and `checkVerifyBlob`
- Renamed `"dopad encrypt:"` SIWE signing message prefix to `"zeropad encrypt:"`

**Why:** App not yet in production; safe to update protocol constants to match the zeropad brand.
