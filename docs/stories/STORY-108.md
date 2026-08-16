# STORY-108: Curriculum media expansion — visuals, slideshows, and table upgrades

**Sprint:** Curriculum tone remediation

**Points:** 13

**Epic:** Student experience

**Owner:** Ryan

**Status:** Planned. Phase 4 of the `2026-08-16` order and voice plan.

## Goal

Add the visual aids and slideshow structures the curriculum needs to break up the text-heavy lesson pattern. Generate the five planned images using ImageGen. Build the three slideshow structures. Add the three new tables.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 6.

## Scope

- Create the asset directory `content/curriculum/_assets/` with subdirectories for 2.1, 2.3, 7.3, 8.x, and `_voice`.
- Generate five images using ImageGen with the ready-to-paste prompts from `docs/audits/2026-08-16-curriculum-order-and-voice-plan.md` Section 6.3:
  1. Match Types Continuum (1536x1024)
  2. Negative Keywords Savings (1536x1024)
  3. STR Triage Decision Tree (1024x1536)
  4. Module Journey Map (2560x1080)
  5. Voice Tone Comparison (1536x1024)
- Build three slideshow structures using the existing Astryx Carousel primitive:
  1. Lesson 2.1 match types deck: 4 slides (broad, phrase, exact, hierarchy).
  2. Lesson 1.1 Big Six metrics deck: 6 slides (one per metric).
  3. Lesson 7.3 triage deck: 5 slides (one per terminal action).
- Add three new tables:
  1. Voice guide bar table in the Admin → Curriculum Editor as a collapsible accordion.
  2. Your answers tracker at the end of each module.
  3. Module dependency matrix (admin-only, 9x9).

## Acceptance checks

- All five images exist in the asset directory and are referenced from at least one lesson.
- All three slideshow structures render in the lesson page and pass the existing carousel a11y checks.
- The three new tables are reachable from their intended UI surface.
- The voice-tone comparison image lives in `_voice/` and is not linked from any student-facing lesson.
- pnpm tsc, pnpm lint, pnpm test, pnpm build pass.

## Verification

- Image dimensions and file sizes match the spec.
- Each slideshow's slides render in the correct order and pass axe a11y checks.
- The module dependency matrix is admin-only and not exposed to student accounts.
