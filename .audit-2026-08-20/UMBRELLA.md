# Audit follow-up: verify & address still-open findings (2026-08-20)

## Context

A comprehensive audit of `amph-v2-greenfield` was produced on 2026-08-20 against commit `1491e4b` (`main`). The audit reproduces findings from the internal `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` (54 findings) plus product/architecture gaps from `CLAUDE.md`, `FEATURES.md`, and the Sprint 14/15 roadmaps.

When verifying the audit against the current `main`, **5 of the 6 "Critical Fixes" were already resolved in earlier rounds** (see `docs/CHANGELOG.md` for the round-by-round fix history, e.g. round 14 skip-link, round 29 QuizEditor labels, round 30 table semantics, round 34 token cleanup, PR #402 final alignment). This issue tracks the items that are still genuinely open.

## Verified closed (no action needed)

- [x] **C-01 Skip-link in `src/app/layout.tsx`** — `src/app/layout.tsx:62` already renders the skip-link. Target `id="main-content"` is wired across checkout / live-classes / verify-email (H-08 round 13/14).
- [x] **C-02 QuizEditor shared `aria-label`** — `src/components/admin/QuizEditor.tsx:203` already keys the label per option (`Mark option ${oIndex + 1} as correct for question ${qIndex + 1}`). PR #379 (round 29).
- [x] **C-03 / C-04 Placeholder-only labels in `QuizEditor` & `CampaignBuilderForm`** — both now use real `<label htmlFor>` (sr-only where appropriate), with `C-XX fix:` comments documenting each call site. PR #379, PR #236.
- [x] **C-05 UserCard 30x30 logout** — `.logoutButton` is now `min-width: 44px; min-height: 44px;` (`UserCard.module.css:56`).
- [x] **C-08 / L11 Table semantics** — every `Admin*Table` ships a `sr-only <figcaption>` and `scope="col"` on every `<th>`. PR #380 (round 30).
- [x] **window.confirm in admin** — `ConfirmSubmitButton` uses Astryx `purpose="required"` (`ConfirmSubmitButton.tsx:7`), not native confirm. Test `src/components/admin/__tests__/admin-event-controls.test.tsx:33` asserts this.
- [x] **Token drift (`var(--brand)`, `var(--font-family-code)`)** — these tokens are not referenced anywhere under `src/`; the only remaining mentions are in `src/app/__tests__/round34-tokens-fieldmanual-submit-button-pins.test.ts` which **enforces** that they stay absent. PR #401 (round 34), PR #147, PR #237.

## Still open (the real follow-up)

### Code quality (audit 5)
- [x] **S-1 `document.querySelector` in `QuizEditor` state updater** — `QuizEditor` now owns its hidden input via `useRef<HTMLInputElement>(null)` and renders it as a sibling. The per-update `document.querySelector` and the mount-time `useEffect` seed are both gone. The H-16 pin test was rewritten to require the new contract. Closed in a follow-up PR (branch `fix/s-1-quizeditor-controlled-hidden-input`).
- [x] **S-2 Missing `displayName` on UI primitives** — closed in PR #418 (2026-08-21). 14 UI primitives in `src/components/ui/` now carry explicit `displayName`. The H-08 test class `src/components/ui/__tests__/s2-s3-displayname-and-shadow-scale.test.ts` pins the contract.
- [x] **S-3 Token naming inconsistency** — closed in PR #418 (2026-08-21). The amph theme and `globals.css` now both use `--shadow-low/--shadow-med/--shadow-high`. The H-08 test class above also pins the shadow-scale contract.

### Voice Stabilization Phase 3 (audit 4)
- [x] **Modules 4-8 voice-guide violations** — Phase 3 second half shipped in PR #417 (2026-08-21). All 16 lessons across Modules 4, 5, 6, 7, 8 received the same three transforms the first half applied to Modules 2-3: dropped `> **Analogy:**` / `> **Tip:**` / `> **Watch out:**` / `> **Key Takeaway:**` blockquote headers and converted to inline prose; converted USD amounts to PHP at the established ~50:1 rate; tightened body-prose sentences to honor the 30-word ceiling. The audit script `scripts/_audit-voice-phase3-m4-8.cjs` reported zero USD, zero em-dashes, zero blockquote-header violations, and zero over-30-word body sentences across the 16 files. STORY-107 marked complete.

### Product & architecture gaps (audit 2)
- [ ] **STORY-086 Instructor calibration** — no mechanism to set "acceptable answer ranges" for simulator grading. No story doc on `main` yet.
- [ ] **STORY-083 Non-binary Listing Audit ground truth** — current grading is binary (`severity === "info" ? "skip" : "fix"`). No context-aware engine.
- [ ] **STORY-081b Real seller-export datasets for Keyword Research** — only 4 of 12 launch niches covered; all marked `synthetic_calibrated`; credential mode rejected. No real-data ingestion pipeline.
- [ ] **STORY-089 Connected-Account Simulator** — documented but no story doc and no code.
- [ ] **Admin 2FA enforcement** — TOTP fully built and opt-in; no policy requiring admins to use it.
- [ ] **Database backup drill** — `docs/DISASTER-RECOVERY-RUNBOOK.md` exists but has never been drilled against live Neon Postgres.

## Acceptance criteria for closing this umbrella

1. Each child issue is filed with a reproducer, a concrete fix sketch, and a `story:` or `area:` label.
2. Code-quality items S-1 / S-2 / S-3 are either shipped in a PR referencing this issue, or have a deferral rationale with target sprint.
3. Voice Phase 3 Modules 4-8 is scoped into a Sprint 16 story with a defined diff budget (the script is reusable).
4. The four product/architecture gaps each have an updated story doc on the relevant sprint branch with at least a calibration/architecture sketch.

## Audit doc provenance

The 2026-08-20 audit doc is a synthesized rephrasing of `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md`, the Aug 14 ultra-review (`docs/ULTRA-REVIEW-2026-08-14.md`), and the feature-gap tracking in `CLAUDE.md` / `FEATURES.md`. When in doubt, the in-repo docs and the latest commits are the source of truth.
