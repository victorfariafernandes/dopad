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
