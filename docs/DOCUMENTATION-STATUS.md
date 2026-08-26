# Documentation Status

## Canonical current sources

The following documents describe the current greenfield product and should be updated first when curriculum or learner-flow behavior changes:

| Document                                         | Purpose                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `CURRICULUM-SYLLABUS.md`                         | Authoritative 12-module, 42-lesson syllabus, tier structure, timings, and assessment claims. |
| `content/CURRICULUM-INDEX.md`                    | Curriculum index, module sequence, lesson purposes, and quiz inventory.                      |
| `content/README.md`                              | MDX source, import, and production-content contract.                                         |
| `docs/CURRICULUM-SYNC-SPEC.md`                   | Best-of-both-worlds synchronization rules for the two curriculum repositories.               |
| `docs/ZERO-KNOWLEDGE-FLOW-REMEDIATION.md`        | Current guided-flow behavior, acceptance contract, and resumable follow-ups.                 |
| `content/migration/teaching-deck-slide-map.json` | Direct provenance and disposition for all 144 source teaching-deck slides.                   |
| `content/migration/target-provenance.json`       | Intentional greenfield extensions without one-to-one source-slide assignments.               |
| `docs/voice-guide.md`                            | Learner-facing tone, sentence, example, and evidence conventions.                            |

## Current product contract

The synchronized curriculum contains **12 modules and 42 lessons** distributed across three courses: PPC Foundations contains modules 0–4, Accelerated Mastery contains modules 5–10, and Ultimate Transformation contains module 11. The learner-facing path is beginner-first: vocabulary and marketplace context come before evidence reading, listing readiness, targeting, campaign construction, controlled optimization, reporting, and capstone workflow.

The course experience displays this order, locks future lessons until the preceding lesson is complete for entitled learners, gates module quizzes until the module lessons are complete, and preserves completed lessons for review. The greenfield implementation is native to the domain, use-case, route, and MDX layers.

## Historical snapshots

Documents under `docs/sprint-*`, `docs/stories/`, `docs/superpowers/`, and portions of `docs/ui-specs/` preserve decisions, acceptance criteria, research findings, or design prompts from earlier stages of the project. Their old counts and implementation descriptions are historical unless the document is explicitly listed as a canonical current source above. The UI-spec archive now includes a current-contract note, but individual mockup examples may still contain illustrative values.

When a historical document is cited in a current decision, pair it with the canonical source that supersedes its implementation claims. Do not silently rewrite historical acceptance records merely to make them look current.

## Documentation update rule

Any future change to module count, lesson count, course tier, learner order, prerequisite policy, quiz gating, or MDX directive contracts must update the relevant canonical source documents and the validation scripts in the same change. Historical records should receive a status note only when their stale content could reasonably be mistaken for the current product contract.
