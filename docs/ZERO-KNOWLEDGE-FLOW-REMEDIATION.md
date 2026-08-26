# Zero-Knowledge Course-Flow Remediation

## Purpose

This document records the learner-flow changes required to take a learner with no Amazon or advertising background through a safe, evidence-led path toward competent junior PPC management. It is the resumable checkpoint for the greenfield implementation.

## Implemented in the current review branch

The greenfield runtime now has one canonical beginner-first order within each course curriculum: onboarding, foundations, listing optimization, keyword research, campaign architecture, portfolio strategy, bidding lab, search-term triage, competitive intelligence, weekly optimization, reporting and troubleshooting, and VA workflow/capstone.

The course detail page uses this order for the first-lesson CTA, curriculum display, progress calculations, and locked states. The PPC Foundations page also presents a visible orientation sequence: vocabulary, evidence, one bounded decision, and proof.

Lesson access is guarded server-side. Enrolled or entitled learners can open the first lesson and completed lessons; a later lesson returns a prerequisite lock until the immediately preceding lesson is complete. Completion is guarded by the same rule, so direct URL submission cannot skip the sequence. The lesson sidebar mirrors the rule with non-link locked states, while the current lesson remains visible for review.

Module quizzes are gated until all lessons in their module are complete. The access notice explains the required prerequisite instead of presenting a generic course-access failure. Existing preview, enrollment, subscription, and admin rules remain intact around the guided gate.

## Acceptance contract

| Area               | Acceptance condition                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Beginner order     | `GuidedFlow` is the shared source of truth for page, sidebar, authorization, and completion order.                                           |
| Vocabulary         | Foundational MDX lessons introduce terms before later lessons require them; the content inventory and lesson-production gates remain green.  |
| Lesson progression | A learner cannot open or complete lesson N+1 before lesson N, except for an administrator or a completed/reviewable lesson.                  |
| Quiz progression   | A module quiz remains unavailable until all lessons in that module are complete.                                                             |
| Evidence loop      | Existing MDX visual, self-check, worksheet, and evidence-task blocks remain available inside the gated sequence.                             |
| Accessibility      | Locked states are text-labelled, keyboard-safe, and do not rely on color alone. Orientation and lock copy work at mobile and desktop widths. |
| Compatibility      | Lesson and module IDs remain stable; course and lesson inventory counts do not change.                                                       |

## Validation checkpoint

The current branch has passed TypeScript, ESLint with the repository's existing warnings only, curriculum validation, lesson-production validation, migration-manifest validation, target-provenance validation, the full Vitest suite, and whitespace validation. The production build compiled successfully before the sandbox process was terminated during a later TypeScript phase under memory pressure; the independent TypeScript gate passed.

## Next resumable checkpoints

The next implementation pass should add explicit cross-course progression between PPC Foundations, Accelerated Mastery, and Ultimate Transformation, if the product intends those paid tiers to unlock strictly in sequence. It should also connect simulator-specific evidence artifacts to lesson completion where the relevant tool contracts expose durable learner progress. Finally, browser QA should exercise an enrolled learner through first lesson, locked second lesson, completion, unlocked next lesson, module quiz, failed quiz remediation, and final capstone readiness.

## Source references

The implementation is based on the zero-knowledge flow audit and remediation roadmap from `amazon-ph-simulators`, the synchronized 12-module curriculum, and the shared migration manifest and target-provenance artifacts in this repository.
