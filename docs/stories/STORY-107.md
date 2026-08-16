# STORY-107: Curriculum voice stabilization — apply voice template across all Module 2-8 lessons

**Sprint:** Curriculum tone remediation

**Points:** 13

**Epic:** Student experience

**Owner:** Ryan

**Status:** Planned. Phase 3 of the `2026-08-16` order and voice plan.

## Goal

Apply the voice template that 0.1, 1.1, and 1.5 already follow to every Module 2-8 lesson. Normalize Filipino context. Audit sentence length.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 5.

## Scope

- Voice template applied to every lesson that was not already touched in STORY-105. Specifically: 2.2, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3. The template:
  1. Open with the work, not the metaphor.
  2. Define the concept in one or two paragraphs of active voice.
  3. Show one worked example with real numbers.
  4. End with a Decision in one sentence the learner can copy and use.
  5. Use blockquotes for client language samples and answer reveals only. Drop `> **Analogy:**`, `> **Tip:**`, `> **Watch out:**` as blockquote headers.
  6. Close with a measured "Key takeaway" that names the lesson's single point.
- Sentence length audit: grep every lesson for sentences over 30 words and split them.
- Filipino context normalization: replace `$` with `₱` across modules 2, 3, 4, 6, 7 except for canonical Amazon examples (e.g., the $40 coffee grinder in 1.1).

## Acceptance checks

- Every Module 2-8 lesson passes the "read aloud" test from `docs/voice-guide.md` line 156.
- No `> **Analogy:**`, `> **Tip:**`, or `> **Watch out:**` blockquote remains in any module 2-8 lesson.
- No sentence exceeds 30 words.
- Every module contains at least one Filipino-context anchor: a city name, a peso amount, or a VA scenario.
- ESLint passes including `local/no-ai-slop`.
- pnpm tsc, pnpm lint, pnpm test pass.

## Verification

- Sentence-length grep on all 31 MDX files, with the offending sentences identified and split.
- Voice-template checklist applied to each modified lesson.
- A representative reader (Filipino VA persona) reads each modified lesson aloud and reports whether the tone reads as "gentle and patient guide" or "military bootcamp."
