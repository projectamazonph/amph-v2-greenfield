# GitHub Issue Tracker Guide

This guide turns the [platform implementation plan](../platform-implementation-plan.md) into a practical issue-tracking system for the repository.

## Issue hierarchy

Each issue should represent one independently reviewable outcome. Large roadmap items should be tracked as epics or milestone-level issues, with smaller implementation issues linked through `blocks`, `blocked by`, or `relates to` references.

| Level      | Purpose                                           | Example                                         |
| ---------- | ------------------------------------------------- | ----------------------------------------------- |
| Release    | A shippable product outcome                       | `R1 — Reliability baseline`                     |
| Workstream | A coherent technical or product area              | `C — Test and quality foundation`               |
| Epic       | A multi-issue outcome with a clear exit condition | `Add browser-level simulator testing`           |
| Task       | A reviewable implementation unit                  | `Add Bid Decisions completion flow test`        |
| Bug        | A reproducible defect or regression               | `Progress disappears after packaged-app update` |

## Priority definitions

| Priority | Use when                                                                          | Expected response                                             |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0       | Security exposure, data loss, broken release, or learning-blocking failure        | Triage immediately; do not allow unrelated work to obscure it |
| P1       | Major reliability, assessment, maintainability, or learner-experience improvement | Schedule in the next relevant release train                   |
| P2       | Scale, analytics, polish, or future-readiness work                                | Schedule after P0/P1 dependencies are stable                  |

## Workstream taxonomy

| Code | Workstream                                | Typical issues                                                 |
| ---- | ----------------------------------------- | -------------------------------------------------------------- |
| A    | Contracts and success metrics             | Result schemas, version semantics, product metrics             |
| B    | Content and grading foundation            | Scenario schema, misconceptions, policies, rubric versioning   |
| C    | Test and quality foundation               | Browser tests, accessibility, coverage, regression contracts   |
| D    | Inline simulator migration                | Keyword Lab, AdConsole, Bulk File, BuyBox, Pacing, Listing     |
| E    | Offline and data durability               | Bundled assets, service worker, export/import, local event log |
| F    | Learner experience and content operations | Skill tracking, adaptive sequencing, authoring and preview     |
| G    | Security, CI/CD, and releases             | CSP, permissions, signing, updater, diagnostics                |
| H    | Sync and instructor platform              | Authentication, sync, roles, reporting, privacy analytics      |

## Release milestones

| Release | Goal                       | Exit condition                                                                                       |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| R1      | Reliability baseline       | Two browser flows pass, offline launch works, progress export/import works, PR CI is read-only       |
| R2      | Architecture consolidation | Three inline simulators conform to the shared descriptor and no longer contain grading logic in HTML |
| R3      | Learning effectiveness     | Skills, misconception feedback, and next-activity recommendations are live                           |
| R4      | Distribution hardening     | Signed/reproducible artifacts, offline packaged-app tests, and no unapproved runtime CDN references  |
| R5      | Optional cloud platform    | Idempotent sync, role enforcement, learner data controls, and reconciled instructor reporting        |

## Recommended issue title format

Use one of the following prefixes:

- `[Feature] <outcome>` for a new capability.
- `[Bug] <observable failure>` for a reproducible defect.
- `[Assessment] <simulator or curriculum change>` for content and grading work.
- `[Tech Debt] <architecture or maintainability outcome>` for internal improvements.
- `[Ops] <release, security, or operational outcome>` for delivery and reliability work.

Titles should describe the outcome, not the implementation mechanism. Prefer `[Feature] Export and restore learner progress` over `[Feature] Add JSON button`.

## Required issue content

Every issue should identify its roadmap workstream, priority, target release, problem statement, scope, dependencies, and observable acceptance criteria. Assessment issues must also state scenario, rubric, and policy version impact. Operational issues must include a verification or rollback path. Bug reports must include a reproducible environment and steps.

## Issue lifecycle

1. **Draft:** The problem and desired outcome are being clarified.
2. **Ready:** Scope, dependencies, acceptance criteria, and target release are defined.
3. **In progress:** An implementation branch or pull request exists.
4. **Validation:** Tests, accessibility checks, offline checks, or content review are running.
5. **Done:** Acceptance criteria are met, documentation is updated, and the linked pull request is merged.
6. **Closed:** The issue is complete or intentionally superseded; link the replacement issue when applicable.

## Definition of ready

An issue is ready for implementation when the affected product area is named, the user or platform problem is clear, scope and non-goals are explicit, dependencies are identified, acceptance criteria are testable, and historical grading or persisted-data impact has been considered.

## Definition of done

An issue is done when the implementation is merged, relevant automated tests pass, learner-facing or operational behavior has been verified, documentation is updated, versioning or migration requirements are satisfied, and any follow-up work is captured in linked issues rather than hidden in the original task.

## Initial issue backlog

The following issues are recommended as the first tracker entries. They are deliberately scoped so they can be opened independently and linked to the relevant release milestone.

| Suggested issue                                                       | Type       | Priority | Release |
| --------------------------------------------------------------------- | ---------- | -------: | ------- |
| Define universal simulator result and descriptor contract             | Tech Debt  |       P0 | R1      |
| Add validated scenario schema and content validation command          | Assessment |       P1 | R1      |
| Add browser completion tests for Bid Decisions and Search Term Triage | Feature    |       P0 | R1      |
| Add progress export/import with merge and replace modes               | Feature    |       P1 | R1      |
| Split pull-request CI permissions from tag-only release permissions   | Ops        |       P0 | R1      |
| Inventory and bundle all production CDN dependencies                  | Ops        |       P0 | R1      |
| Migrate Keyword Lab into a pure grading module                        | Tech Debt  |       P1 | R2      |
| Migrate AdConsole Pro into the shared simulator contract              | Tech Debt  |       P1 | R2      |
| Migrate Bulk File into modular grading and browser tests              | Tech Debt  |       P1 | R2      |
| Add misconception codes to migrated simulator feedback                | Assessment |       P1 | R3      |
| Add skill-level progress and next-activity recommendations            | Feature    |       P1 | R3      |
| Add accessibility checks to the browser test workflow                 | Feature    |       P1 | R3      |
| Add CSP and safe rendering boundaries                                 | Ops        |       P1 | R4      |
| Add signed installer and packaged-app smoke tests                     | Ops        |       P1 | R4      |
| Define cloud attempt model and synchronization conflict policy        | Feature    |       P2 | R5      |
| Add instructor cohort reporting with learner data controls            | Feature    |       P2 | R5      |

## Review rules

Assessment changes require review from an assessment or content owner. Security, privacy, CI permission, installer, and updater changes require review from the platform owner. Any change that can alter scores or invalidate historical progress must include explicit versioning and regression evidence before merge.
