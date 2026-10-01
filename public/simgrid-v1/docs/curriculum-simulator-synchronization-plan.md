# Curriculum and Simulator Synchronization Plan

**Created:** 2026-08-20  
**Repository:** `projectamazonph/amazon-ph-simulators`  
**Live site:** https://projectamazonph.github.io/amazon-ph-simulators/
**Baseline:** `master` after PR #27 (`3f844bea`)
**Current delivery:** UI remake, accessibility foundation, curriculum/progress contracts, and shared PPC policy merged; 96 regression tests passing
**Status:** Active implementation plan — Phases 1–3 complete; Phase 4 scenario-bank foundation complete, content expansion remains active

## Delivery update

The curriculum manifest, shared progress contract, beginner PPC policy, versioned scenario-bank foundation, distinct simulator layouts, and shared accessibility layer are implemented and regression-tested. Campaign Architect and Account Audit have selectable beginner and intermediate content packs. Remaining work is scenario depth, persistent capstone artifacts, legacy engine coverage, and the explicitly listed accessibility/security refinements.

## Outcome

Turn SimGrid from a collection of independently useful tools into one guided academy where:

- PPC Coach introduces concepts before related simulator work.
- Every module assigns relevant simulator practice.
- Simulator attempts and passing results contribute to student progress.
- PPC decision rules stay consistent across lessons, handouts, quizzes, and simulators.
- Scenario content can expand without duplicating scoring or navigation logic.
- The capstone carries one account through research, setup, optimization, execution, and reporting.

## Baseline audit

The current project contains 12 simulator pages plus PPC Coach. PPC Coach contains 12 modules, 60 lessons, 36 module-quiz questions, a 15-question final exam, and four embedded practice tools.

Validation at the start of this plan:

- `node --test tests/*.test.cjs`: 21 tests passed.
- All 185 local HTML references resolved.
- All 14 inline JavaScript blocks parsed successfully.
- The working tree was clean.

### Primary gaps

| Priority | Area            | Gap                                                                                                                                                                    | Impact                                                          |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P0       | Student journey | PPC Coach appears after every simulator in the hub and no guided next action exists                                                                                    | Beginners can enter advanced simulators without prerequisites   |
| P0       | Synchronization | External simulator results do not update PPC Coach or hub progress                                                                                                     | Completion is fragmented and graduation ignores most simulators |
| P0       | PPC policy      | Evidence thresholds and search-term actions differ between lessons and tools                                                                                           | Students can be rewarded for conflicting decisions              |
| P1       | Simulator depth | Campaign Architect and Account Audit have two packs; SQP Studio, Bid Decisions, and Client Onboarding now have six-row runs, while deeper multi-pack expansion remains | Continued scenario depth is needed to prevent memorization      |
| P1       | Capstone        | Current capstone uses five guided stages but does not yet persist the underlying account artifacts                                                                     | It does not yet prove an end-to-end operating workflow          |
| P1       | Curriculum      | Module 5 is omitted from the student guide; SQP and bulk operations lack formal lessons                                                                                | Important skills are not sequenced or assigned                  |
| P1       | Documentation   | Historical audit language still needs periodic reconciliation with implementation                                                                                      | Stale findings can misdirect future maintenance                 |
| P1       | Test coverage   | Current automated tests focus on the six recent simulator cores and hub links                                                                                          | Complex legacy simulator behavior is not protected              |

## Curriculum map

| Module                           | Required simulator practice      | Completion target                | Current gap                                                        |
| -------------------------------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| 0 · Amazon Basics                | BuyBox Dojo introduction         | Complete listing-readiness check | No guided handoff                                                  |
| 1 · What is PPC?                 | AdConsole auction mission        | Complete first auction mission   | No guided handoff                                                  |
| 2 · Money Math                   | Keyword Lab economics drill      | 80% calculation accuracy         | No dedicated progress event                                        |
| 3 · Campaign Structure           | Campaign Architect               | 75%+                             | Beginner and intermediate packs live; expand toward five per level |
| 4 · Keywords & Match Types       | Keyword Lab + Search Term Triage | 75%+                             | Decision thresholds need alignment                                 |
| 5 · Listing Readiness            | BuyBox Dojo                      | 75%+ listing audit               | Missing from student guide                                         |
| 6 · Campaign Setup               | Campaign Architect + AdConsole   | 75%+ and saved build             | No shared completion                                               |
| 7 · Bids & Budgets               | Bid Decisions + Pacing Deck      | 75%+                             | No shared completion                                               |
| 8 · Search Terms & Negatives     | Search Term Triage + Bulk File   | 75%+ and valid change file       | No connected workflow                                              |
| 9 · Weekly Optimization          | Account Audit workflow           | 75%+                             | Beginner and intermediate packs live; expand toward five per level |
| 10 · Reporting & Troubleshooting | Account Audit + Report Builder   | 75%+ and report generated        | Reporting assessment is lightweight                                |
| 11 · VA Workflow & Capstone      | Client Onboarding + Capstone     | 85%+ capstone                    | Capstone is not persistent                                         |

Supplemental lesson work is required before SQP Studio and Bulk File Simulator become formal graduation requirements.

## Architecture boundaries

### Curriculum manifest

Create `assets/curriculum-manifest.js` as the stable source of truth for:

- Module identifiers and order
- Lesson-to-simulator assignments
- Prerequisites
- Passing targets
- Remediation destinations
- Simulator metadata used by hub and Coach

The manifest owns curriculum relationships. It does not own scoring calculations, rendering, or storage.

### Progress contract

Create a small progress module with these responsibilities:

```js
recordAttempt({ simulatorId, scenarioVersion, rubricVersion, score, passed, completedAt });
getSimulatorProgress(simulatorId);
getModuleProgress(moduleId);
getRecommendedNextAction();
```

Local storage remains the first adapter. The contract must permit a future authenticated backend without changing curriculum or scoring policy.

### PPC decision policy

Create a testable policy module for shared beginner rules:

- Evidence/confidence bands
- Relevant versus irrelevant zero-order terms
- Negative exact versus negative phrase
- Harvesting confidence
- Bid-change bounds
- Budget-scaling conditions
- Listing-versus-targeting diagnosis

Lessons may explain the policy in plain language; simulator cores apply the same contract to grading.

### Scenario content contract

Every expanded simulator scenario should include:

```js
{
  (id,
    version,
    rubricVersion,
    difficulty,
    prerequisiteModules,
    objectives,
    estimatedMinutes,
    dataset,
    tasks,
    rubric,
    feedback,
    misconceptionTags);
}
```

Published scenario and rubric versions must remain stable for stored attempts.

## Implementation phases

### Phase 1 — Curriculum foundation

**Status:** Complete in PR #20.

**Files:** `assets/curriculum-manifest.js`, tests, `index.html`, `ppc-coach.html`, Learn documentation.

Deliverables:

1. Add the tested curriculum manifest.
2. Put PPC Coach and “Continue learning” ahead of the free-choice simulator library.
3. Add module-to-simulator assignments and prerequisite copy.
4. Restore Module 5 to the student guide.
5. Update Learn navigation to include the current simulator set.

Acceptance:

- Every Coach module has an explicit practice assignment.
- Hub and Coach consume or validate against the same manifest.
- No simulator route is removed.
- Existing Coach progress remains readable.

### Phase 2 — Shared progress

**Status:** Complete on `feature/shared-progress-integration`; six graded simulators emit versioned attempts and the hub/Coach surface status, best score, and attempt count. Legacy simulator event integration remains in Phase 6.

Deliverables:

1. Define the progress contract and local-storage adapter.
2. Record score, pass state, scenario version, rubric version, and timestamps.
3. Preserve existing local-storage keys through compatibility reads.
4. Surface “Not started,” “In progress,” “Passed,” and best score in the hub and Coach.
5. Add attempt history without deleting previous results on retry.

Acceptance:

- Completing a simulator updates its assigned module practice state.
- Existing student Coach progress is not reset.
- Resetting one attempt does not erase unrelated progress.

### Phase 3 — PPC policy alignment

**Status:** Complete for the current beginner policy contract; the tested shared policy covers evidence bands, relevance-based negatives, bid bounds, and profitable budget constraints. Bid Decisions and policy-covered Account Audit findings consume it; Coach, Search Triage, and Keyword Lab contradictions have been reconciled.

Deliverables:

1. Add decision-policy tests before changing teaching content.
2. Reconcile under-10-click, zero-order, relevance, harvesting, and bid rules.
3. Update Coach lessons, handouts, Search Triage, Keyword Lab, Bid Decisions, and Account Audit.
4. Label 70% as module pass, 75% as simulator proficiency, and 85% as supervised-readiness where applicable.

Acceptance:

- Equivalent evidence receives equivalent recommendations across tools.
- Tests cover thin data, irrelevant traffic, relevant non-converters, expensive converters, and profitable constrained campaigns.

### Phase 4 — Scenario banks

**Status:** Foundation complete; content expansion remains in progress. The deterministic scenario-bank contract is complete, progress attempts separate stable simulator identity from selected scenario identity, and Campaign Architect plus Account Audit ship selectable beginner/intermediate content packs.

Expand SQP Studio, Bid Decisions, Campaign Architect, Account Audit, and Client Onboarding to:

- Three difficulty levels
- At least five scenarios per level over time
- Multiple products, margins, goals, and lifecycle stages
- Deterministic datasets
- Misconception-based remediation

Initial content pack should add one beginner and one intermediate scenario to each simulator before scaling further.

### Phase 5 — Persistent capstone

Build one account case that carries these artifacts forward:

1. Client and product brief
2. Keyword and negative seed list
3. Campaign structure
4. Performance report
5. Optimization decisions
6. Bulk change file
7. Change log
8. Client report

Use weighted scoring for diagnosis, PPC reasoning, action quality, risk awareness, completeness, and communication.

### Phase 6 — Legacy simulator content and tests

Add guided missions and regression coverage to:

- AdConsole Pro
- Keyword Lab
- Search Term Triage
- Bulk File Simulator
- BuyBox Dojo
- Pacing Deck

Prioritize deterministic simulations, budget-cap correctness, transactional bulk validation, mobile usability, and accessible feedback.

### Phase 7 — New simulator backlog

| Priority | Simulator                         | Core outcome                                                         |
| -------- | --------------------------------- | -------------------------------------------------------------------- |
| P1       | PPC Profitability Lab             | Break-even ACOS, allowable CPC, contribution margin, ROAS, TACoS     |
| P1       | Placement Strategy Lab            | Top of Search, Product Pages, Rest of Search adjustments             |
| P1       | Weekly Optimization Workflow      | Audit, prioritize, change, log, and report one account               |
| P1       | Client Reporting Studio           | Convert raw metrics into an accurate client update                   |
| P2       | Product Targeting Lab             | ASIN/category targeting and competitor-page diagnosis                |
| P2       | Sponsored Brands Planner          | Brand-defense, video, headline search, and Store strategy            |
| P2       | Sponsored Display Planner         | Remarketing, audiences, and defensive targeting                      |
| P2       | Inventory and Buy Box Response    | Safe ad actions under stock, price, suppression, and Buy Box changes |
| P2       | Change Log and Approval Simulator | VA authority, escalation, and client approvals                       |
| P3       | Marketplace Expansion Lab         | Marketplace, currency, timezone, seasonality, and language           |

## Delivery strategy

Use small PRs with stable acceptance boundaries:

1. Curriculum manifest and guided entry
2. Shared progress adapter
3. PPC policy alignment
4. Scenario-bank infrastructure and first content pack
5. Persistent capstone
6. Legacy simulator missions and tests
7. New simulator vertical slices

Every behavior change follows Red → Green → Refactor. Every simulator scoring or calculation change requires unit tests. Hub and lesson-path changes require route and curriculum contract tests. Each PR must preserve existing routes and student local progress.

## Definition of done

The synchronization program is complete when:

- PPC Coach is the primary learning entry.
- Every lesson sequence assigns relevant simulator practice.
- Hub, Coach, and simulator completion use one progress contract.
- Decision rules are consistent and tested.
- New simulators provide replayable scenario depth rather than one memorized answer set.
- Capstone produces an auditable multi-stage student submission.
- Documentation matches the live curriculum and simulator registry.
- Relevant tests, script parsing, route checks, and mobile checks pass.
