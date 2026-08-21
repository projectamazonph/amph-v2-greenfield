# Next session prompt

Copy this context into the next engineering session.

```text
Repository: https://github.com/projectamazonph/amph-v2-greenfield
Branch policy: branch from main, PR to main, squash merge, auto-delete source branch
Production: https://projectamazonph.vercel.app
Retired origin: https://amph-v2-greenfield.vercel.app
Main reviewed: 1baf988 (2026-08-21)

Read first:
1. AGENTS.md
2. docs/README.md
3. STATE.md
4. OPERATING_GUIDELINES.md
5. FEATURES.md
6. SESSION-HANDOVER.md

Latest repairs:
- PR #427: LEARN-025 Module 4 campaign pre-flight maps (STORY-127). Re-cuts the closed PR #395 work with PHP-aligned rationale examples that match the post-PR-417 currency state
- PR #426: doc-staleness sweep to refresh last-verified metadata to 8988ac1
- PR #398: round 33 audit closure, replace 2 raw `<a>` route changes with `<Link>` and pin H-09/H-11/H-12 contracts (rebased; `.commit-msg-r33.txt` dropped)
- PR #396: round 32 audit closure, pin C-02 / C-05 / C-06 / C-07 contracts and update audit doc (rebased)
- PR #425: doc-staleness sweep to refresh last-verified metadata to 54b5a18
- PR #424: S-1 QuizEditor owns its hidden input via `useRef`; rewrites the H-16 pin test; closes `.audit-2026-08-20/UMBRELLA.md` S-1
- PR #423: doc-staleness sweep (STATE.md, NEXT-SESSION-PROMPT.md, STUDENT-FEATURE-GAP-ANALYSIS.md)
- PR #417: voice stabilization Phase 3 second half (Modules 4-8, STORY-107)
- PR #418: S-2 displayName on UI primitives + S-3 shadow scale unification
- PR #419: L-03 server-safe CardProps subset
- PR #420: active lesson primitives (SelfCheck, TradeOffTable, ProcessDiagram, PitfallCallout) + directive plugin + validator (STORY-122, STORY-123)
- PR #421: docs refresh after the 2026-08-21 audit cycle close
- PR #422: ignore .qoder/ and package-lock.json in .gitignore
- PR #305: student journey and accessibility repair
- PR #306: manual tier grants auto-enroll eligible published courses
- PR #307: admin-login redirect carries the session cookie
- PR #308: forgot-password links use the canonical production origin

Last verified gate:
- 3,901 Vitest passed, 3 skipped
- 669 architecture checks passed
- TypeScript, ESLint, production build, Playwright, and Lighthouse passed
- Coverage: 80.42% statements / 74.19% branches / 80.71% functions / 81.80% lines

Rules:
- Verify a reported gap against source before changing code.
- Follow TDD for behavior changes.
- Preserve the five-layer dependency direction.
- Never push directly to main.
- Never use the retired deployment URL in new production links.
```
