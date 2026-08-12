# Next session prompt

Copy this context into the next engineering session.

```text
Repository: https://github.com/projectamazonph/amph-v2-greenfield
Branch policy: branch from main, PR to main, squash merge, auto-delete source branch
Production: https://projectamazonph.vercel.app
Retired origin: https://amph-v2-greenfield.vercel.app
Main reviewed: ee1737a (2026-08-12)

Read first:
1. AGENTS.md
2. docs/README.md
3. STATE.md
4. OPERATING_GUIDELINES.md
5. FEATURES.md
6. SESSION-HANDOVER.md

Latest repairs:
- PR #305: student journey and accessibility repair
- PR #306: manual tier grants auto-enroll eligible published courses
- PR #307: admin-login redirect carries the session cookie
- PR #308: forgot-password links use the canonical production origin

Last verified gate:
- 3,816 Vitest passed, 2 skipped
- 665 architecture checks passed
- TypeScript, ESLint, production build, Playwright, and Lighthouse passed

Rules:
- Verify a reported gap against source before changing code.
- Follow TDD for behavior changes.
- Preserve the five-layer dependency direction.
- Never push directly to main.
- Never use the retired deployment URL in new production links.
```
