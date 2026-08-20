# STORY-123: Module 1 active-pass — apply primitives to lessons 1.1-1.5

**Sprint:** Learning experience uplift, wave 3

**Points:** 5

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress on `feat/active-lesson-primitives`. Lessons 1.1, 1.2, 1.3, 1.4, and 1.5 carry the new blocks per the design spec table. PR not yet opened.

## Goal

Make Module 1 lessons active instead of read-only by slotting in the primitives
shipped in STORY-122 where they earn their keep. Preserve existing copy. No
copy edits outside block placement.

## Source

`docs/superpowers/specs/2026-08-19-active-lesson-primitives-design.md`
(`## 8. Module 1 application`).

## Scope

- 1.1 — 1 `TradeOffTable` (`big-six`); 1 `PitfallCallout` (`pitfall`); 1
  `<SelfCheck>` (max-CPC).
- 1.2 — 1 `ProcessDiagram` (`cpc-vs-ctr`); 1 `TradeOffTable` (CPC ↔ CTR);
  1 `<SelfCheck>`.
- 1.3 — 1 `TradeOffTable` (ACoS vs TACoS vs ROAS); 1 `<SelfCheck>` (numeric
  break-even).
- 1.4 — 1 `PitfallCallout` (`warning`, "ROAS without margin is decoration");
  1 `<SelfCheck>`.
- 1.5 — 1 `ProcessDiagram` (`diagnostic-order`); 1 `<SelfCheck>` (full case,
  smallest safe action).

Totals: 5 TradeOffTable, 4 ProcessDiagram, 4 PitfallCallout, 5 SelfCheck. No
lesson exceeds three new blocks. Each block has a unique lesson-scoped `id`.

## Acceptance criteria

- Each block uses the IDs from Section 8 of the design spec.
- Block body copy follows the voice guide (no em-dash, no `> **Analogy:**`,
  Filipino context where applicable, sentence length within the 30-word ceiling
  for body prose).
- The new content does not regress the existing production contract
  (outcome, decision, worked example, active attempt, feedback, evidence,
  retrieval cue) on any Module 1 lesson.

## Verification

- `pnpm validate:lesson-production --strict` exits 0 (every Module 1 lesson is
  complete).
- ESLint `local/no-ai-slop` passes.
- Visual: open each of the five lessons on the deployed preview and confirm
  block placement matches the design spec table.
