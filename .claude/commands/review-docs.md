---
description: Reads all files in /docs as ground truth, then reviews changed or staged files for spec and style violations, reporting by file and line number.
allowed-tools: Read, Bash
---

# Dopad Spec-Aware Code Review

Perform a structured code review for the dopad project. Follow every phase in order.

## Phase 1 — Load specifications

Read every file in `docs/` before looking at any code. These are your ground truth.

```bash
ls docs/
```

Then read each file:
- Read `docs/architecture.md`
- Read `docs/api-spec.md`
- Read `docs/code-style.md`
- Read `docs/features.md`

## Phase 2 — Identify files to review

Get changed and staged files:

```bash
git diff --name-only HEAD
git diff --name-only --cached
```

If no changed files are found, review all source files:

```bash
find . -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*"
```

Read every file that needs review.

## Phase 3 — Review Go files (`*.go`)

Run static analysis:

```bash
cd backend && go vet ./... 2>&1
```

Then check manually against `docs/code-style.md`:

| Check | Severity |
|-------|----------|
| Error discarded with `_` | ERROR |
| Handler does not call `cors(w, r)` first | ERROR |
| Handler does not return when `cors()` returns `true` | ERROR |
| Response not using `writeJSON` | WARNING |
| Shared map accessed without mutex | ERROR |
| Raw integer status code (e.g. `200`) instead of `http.StatusOK` | WARNING |
| Internal error string exposed in JSON response | ERROR |
| Exported identifier not PascalCase / unexported not camelCase | WARNING |

## Phase 4 — Review TypeScript/TSX files

Run type checking:

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Run lint:

```bash
cd frontend && npx eslint --ext .ts,.tsx . 2>&1
```

Then check manually against `docs/code-style.md`:

| Check | Severity |
|-------|----------|
| `any` type annotation | ERROR |
| Direct `fetch()` call instead of `apiFetch` | ERROR |
| `localStorage` used for auth token | ERROR |
| Component uses hooks/events but lacks `"use client"` | ERROR |
| Internal import uses `../../` instead of `@/` | WARNING |
| Non-page/layout file uses default export | WARNING |
| Component file not PascalCase / utility file not camelCase | WARNING |

## Phase 5 — API contract check

For any file touching API routes or `apiFetch` call sites, verify against `docs/api-spec.md`:

1. Request method and path match the spec exactly
2. Request body shape matches the spec
3. Error responses are handled as `{ "error": "..." }` objects
4. 400 / 401 / 404 status codes are handled separately where the spec distinguishes them

## Phase 6 — Output the report

```
## Dopad Spec Review Report

**Files reviewed:** [list]

### Errors (must fix)

| File | Line | Rule | Details | Fix |
|------|------|------|---------|-----|

### Warnings (should fix)

| File | Line | Rule | Details | Fix |
|------|------|------|---------|-----|

### Type / Lint output
[Relevant tsc and eslint output]

### API contract
[Any mismatches with docs/api-spec.md, or "No mismatches found"]

### Summary
X errors, Y warnings — [overall assessment]
```
