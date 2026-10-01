# Planned Simulator Roadmap

Source reference: `projectamazonph/va-project-ph`, docs `36-simulators-platform.md` through `42-simulator-roadmap.md`.

Live GitHub Pages site: https://projectamazonph.github.io/amazon-ph-simulators/

This file copies the planned simulator set into SimGrid so the imported work can evolve inside this project without losing the curriculum intent from VA Project PH.

## Current delivery status — 2026-08-20

- Curriculum manifest and guided PPC Coach entry: complete.
- Shared versioned progress and hub/Coach status: complete for the six newer graded simulators; legacy simulator integration remains a separate backlog item.
- Shared PPC decision policy alignment: complete for the covered beginner rules and regression-tested across the policy consumers.
- Scenario-bank foundation: complete; content-pack expansion is in progress.
- Persistent multi-artifact capstone, expanded legacy regression coverage, and deeper multi-pack scenario expansion remain planned.

The active implementation sequence and acceptance criteria live in `docs/curriculum-simulator-synchronization-plan.md`.

## Platform contract copied from VA Project PH

Every future simulator should stay inside these rules:

- Use synthetic or explicitly approved training data only.
- Never accept live Amazon credentials.
- Never send simulator decisions to Amazon Ads or change a real budget, bid, listing, or campaign.
- Label results as practice/formative, not certification or hiring proof.
- Preserve scenario version and rubric version for attempts once persistence exists.
- Give feedback on the work, not the learner.

## Planned simulator inventory

| ID      | Simulator                         | Current SimGrid Status                               | Build Priority | Integration Notes                                                                                                                 |
| ------- | --------------------------------- | ---------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| S1      | Search-Term Report Lab            | Covered by `search-triage.html`                      | Keep improving | Align copy with VA Project PH rule: no universal zero-order negative rule.                                                        |
| S2      | Bid Decisions                     | Live in `bid-decisions.html`                         | Keep improving | Tests raise/hold/lower/investigate decisions with a separated scoring core in `assets/bid-decisions-core.js`.                     |
| S3      | Budget and Pacing                 | Covered by `pacing-deck.html`                        | Keep improving | Keep budget pacing separate from profitability in feedback.                                                                       |
| S4      | Campaign Builder / Console Wizard | Partial in `ad-console.html`                         | P1             | Add a guided SP/SB/SD planning wizard or adapt the existing setup flow with stronger rubric feedback.                             |
| S5      | Listing Audit                     | Partial in `listing.html`                            | P1             | Add explicit listing-readiness audit scoring before PPC pressure testing.                                                         |
| S7      | Bulk Operations                   | Covered by `bulk-file.html`                          | Keep improving | Preserve preview, affected-row counts, and rollback guidance.                                                                     |
| S8      | Campaign Architect                | Two scenario packs live in `campaign-architect.html` | Keep expanding | Selectable beginner and intermediate campaign-map practice preserves stable progress identity and versioned rubrics.              |
| S9      | Account Audit                     | Two scenario packs live in `account-audit.html`      | Keep expanding | Selectable beginner and intermediate account triage covers waste, scale, tracking integrity, thin evidence, and retail readiness. |
| S10     | SQP Studio                        | Live in `sqp-studio.html`                            | Keep improving | Tests query visibility and conversion-signal analysis with a separated scoring core in `assets/sqp-studio-core.js`.               |
| S11     | Client Onboarding                 | Live in `client-onboarding.html`                     | Keep improving | Tests checklist practice for access boundaries, goals, product facts, constraints, cadence, approvals, and open questions.        |
| S12-S14 | Capstone Sequence                 | Live in `capstone-sequence.html`                     | Keep improving | Tests the sequence across research, setup, optimization, reporting, and client communication.                                     |

## Recommended improvement order

All imported planned simulators now have live first-pass implementations. Campaign Architect and Account Audit have replayable beginner/intermediate packs, while SQP Studio, Bid Decisions, and Client Onboarding now contain expanded six-row practice runs. Next content work should add selectable packs to those three tools and replace the lightweight S12-S14 exercise with the persistent capstone workflow.

## Final batch: Campaign Architect, Account Audit, Client Onboarding, and Capstone

The remaining planned simulators now share a small decision-simulator architecture:

- `assets/decision-simulator-core.js` owns generic row scoring, pass/fail summary behavior, and the decision bonus model.
- `assets/decision-simulator-page.js` owns the browser table renderer, local attempt storage, grading events, and row feedback rendering.
- `assets/decision-simulator.css` owns the shared visual treatment for the final-batch pages.
- Each simulator keeps its own scenario data, answer key, labels, options, and feedback in a focused `assets/*-core.js` file.

Live pages:

- `campaign-architect.html` covers launch structure, core targeting, prelaunch negatives, and the first review rule.
- `account-audit.html` covers proven waste, profitable capped campaigns, listing/offer friction, and thin-data monitoring.
- `client-onboarding.html` covers Ads access, KPI guardrails, product facts, and approval rules.
- `capstone-sequence.html` covers research, setup, optimization, and reporting sequence decisions.

Regression coverage:

- `tests/decision-simulator-core.test.cjs` verifies the shared scoring contract.
- `tests/remaining-simulators-core.test.cjs` verifies perfect-score paths and focused judgment failures for the four final-batch simulators.
- `tests/hub-links.test.cjs` verifies every new page is reachable from the hub, roadmap archive, and shared shell registry.

## Second shipped simulator: Bid Decisions (S2)

`bid-decisions.html` is the second planned simulator moved into the live SimGrid hub.

Implementation notes:

- The page is a self-contained static simulator that uses the shared `assets/shell.js` chrome.
- Bid metrics, answer keys, confidence scoring, and feedback live in `assets/bid-decisions-core.js`.
- The core module exports through CommonJS for Node tests and `window.BidDecisionsCore` for the browser.
- Student progress is stored locally under `aph-bid-decisions-attempt`.
- The simulator focuses on action sizing and confidence: proven winners, expensive converters, thin data, and wasted spend.

Regression coverage:

- `tests/bid-decisions-core.test.cjs` verifies CPC, CVR, ACOS, ROAS, full-credit scoring, and partial action/confidence scoring.
- `tests/hub-links.test.cjs` verifies the simulator is reachable from the main hub, the planned-simulators page, and the shared shell registry.

## First shipped simulator: SQP Studio (S10)

`sqp-studio.html` is the first planned simulator moved into the live SimGrid hub.

Implementation notes:

- The page is a self-contained static simulator that uses the shared `assets/shell.js` chrome.
- Scoring and SQP metric calculations live in `assets/sqp-studio-core.js` instead of inline page logic.
- The core module exports through CommonJS for Node tests and `window.SQPStudioCore` for the browser.
- Student progress is stored locally under `aph-sqp-studio-attempt`.
- The simulator focuses on evidence quality: visibility gap, conversion gap, data-confidence limit, and wasted exposure.

Regression coverage:

- `tests/sqp-studio-core.test.cjs` verifies SQP metrics, full-credit scoring, missed-evidence scoring, and deterministic feedback.
- `tests/hub-links.test.cjs` verifies the simulator is reachable from the main hub, the planned-simulators page, and the shared shell registry.

## Release checklist for each new simulator

- Learning objective ties to a real VA task.
- Synthetic data and formulas have an independent review.
- Pure scoring/calculation logic has Node test coverage where practical.
- Practice-data copy appears at start, decision, and result.
- Mobile layout has no horizontal scroll.
- Loading, empty, error, submitted, scored, and retry states are accounted for.
- Feedback includes evidence, risk, and next step.
- Existing live simulator routes still load after integration.
