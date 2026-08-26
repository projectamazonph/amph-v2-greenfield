# Curriculum Synchronization Specification

## Decision

`amph-v2-greenfield` will keep its MDX, fact-card, inventory, course-tier, and native directive architecture. It will absorb the stronger operational arc from `amazon-ph-simulators`: weekly optimization, reporting and troubleshooting, VA permissions, SOPs, client communication, and capstone evidence.

The target is not a byte-for-byte copy. The greenfield content remains the source of truth for factual corrections and platform-specific language. The source repository contributes the missing syllabus breadth, beginner-first sequencing, concrete work examples, explicit safety boundaries, and simulator/evidence handoffs.

## Syllabus mapping

| Course                  | Modules | Role                                                                                                                      |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| PPC Foundations         | 0–4     | Onboarding, metrics, keywords, listing readiness, campaign architecture                                                   |
| Accelerated Mastery     | 5–10    | Portfolio strategy, bidding, search-term triage, competitive intelligence, weekly optimization, reporting/troubleshooting |
| Ultimate Transformation | 11      | VA workflow, client communication, capstone evidence                                                                      |

This produces 12 modules and 40 lessons. Module and lesson slugs remain stable for existing content. New lessons use the source repository’s `m9l1` through `m11l4` sequence with greenfield-compatible filenames and frontmatter.

## Content and tone rules

Every lesson uses the greenfield voice guide and the source beginner standard together: direct plain English, short sentences, concrete numbers, Filipino VA context where useful, one job decision per section, and no marketing filler. Acronyms are defined before use. Illustrative numbers are labeled as examples. Amazon-specific claims remain qualified and retain a fact card or source note where appropriate.

Every lesson should expose the following learner path in visible content: outcome, job situation, decision in one sentence, concise explanation, worked example, active attempt, answer or feedback reveal, evidence instruction, retrieval cue, and next action. A native MDX directive should explain the decision when a table or paragraph would make the concept harder to see.

## Visual learning map

| Lesson family                    | Native greenfield treatment                                             |
| -------------------------------- | ----------------------------------------------------------------------- |
| Money and metrics                | `formula-ladder`, `visual` worked example, and `SelfCheck`              |
| Keyword and search-term judgment | `classification-board`, `decision-flow`, `evidence-ledger`              |
| Listing and funnel diagnosis     | `annotated-listing`, `funnel-canvas`, `insight-router`                  |
| Campaign and portfolio structure | `hierarchy-builder`, `portfolio-map`, `comparison-table`                |
| Pacing and routine               | `timeline-calendar`, `seasonal-calendar`, `decision-flow`               |
| Reporting and troubleshooting    | `visual` metric matrix, `evidence-ledger`, `decision-flow`, `SelfCheck` |
| VA operations and capstone       | `lesson-pathway`, `simulation-brief`, `simulation-rubric`, `SelfCheck`  |

## Release guardrails

The inventory, public claims, seed mapping, and quiz mapping must agree with the 12-module syllabus. The source repository’s four formative simulators remain formative. Module 11 is a supervised-work capstone layer, not an employment guarantee. Any changed MDX must pass curriculum inventory validation, lesson-production validation, TypeScript checks, unit tests, and a browser smoke check for a foundation lesson and a newly added operational lesson.
