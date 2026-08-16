# STORY-105: Curriculum voice quick wins — remove bootcamp tone

**Sprint:** Curriculum tone remediation

**Points:** 5

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress. Phase 1 of the `2026-08-16` order and voice plan.

## Goal

Remove the most aggressive voice patterns from the curriculum so the platform reads as a gentle and patient guide, not a military bootcamp. Cover the three worst-offender lessons with full or near-full rewrites, and sweep the remaining `> **Watch out:**` blockquotes to a measured register.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 3.

## Scope

- Full rewrite of `2.1-match-types.mdx` to remove the "fire hose," "sniper rifle," and "teenager with a credit card" metaphors and the per-section `> **Analogy:**` blockquote pattern.
- Targeted paragraph swaps in `2.3-negative-keywords.mdx` (opening, Analogy blockquote, Tip blockquote after the before/after) and title change.
- Targeted paragraph swaps in `7.2-negative-keywords.mdx` (opening, Analogy blockquote) and title change.
- Watch-out sweep in `4.3-campaign-structure.mdx`: replace the "Watch out: Don't use names like 'Campaign 1'..." blockquote with a measured inline sentence.
- Watch-out sweep in `6.2-placement-adjustments.mdx`: rename the "Multiplier Trap (Read This Twice)" header to "Run the Math Before You Commit" and rewrite the "This isn't theoretical" sentence.
- Watch-out sweep in `7.3-str-triage-prep.mdx`: replace the "Watch out: The #1 triage mistake..." blockquote with a measured inline sentence.

## Acceptance checks

- ESLint passes including the `local/no-ai-slop` rule.
- All six modified lessons read aloud without criminal or violent metaphors.
- No `> **Watch out:**` blockquote remains anywhere in the module 2-7 lessons.
- The voice guide's "read aloud" test holds for every modified section.
- pnpm tsc, pnpm lint, pnpm test pass.

## Verification

- Re-read each modified lesson against `docs/voice-guide.md` lines 12 and 156.
- Confirm no Bootcamp-phrase fingerprints remain: "burns through spend faster than a teenager with a credit card," "leaving your front door open," "sniper rifle," "bouncer at the door of a nightclub," "fighting with one hand tied behind your back," "the ratio is backwards," "expensive clutter."
- Cross-check the full curriculum grep for `> **Watch out:**` returns zero matches.
