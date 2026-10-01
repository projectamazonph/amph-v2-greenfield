# Amazon PH Simulators Codebase Audit

**Audit date:** 2026-08-21
**Scope:** UI, copy, simulator logic, state mutation, accessibility, and validation
**Repository:** `projectamazonph/amazon-ph-simulators`
**Live site:** https://projectamazonph.github.io/amazon-ph-simulators/

> Historical baseline: this report records the repository state on 2026-08-18. It is not the current release status. Later work added automated tests, fixed parsing blockers, introduced curriculum/progress contracts, and aligned shared PPC policy. Re-verify an individual finding before treating it as open.

## Current status addendum — 2026-08-21

- The repository now has a Node test harness with 91 passing tests.
- Inline-script parsing is included in delivery verification; the two P0 syntax blockers no longer describe the current baseline.
- PPC Coach is the primary guided entry and all 12 modules have simulator assignments through `assets/curriculum-manifest.js`.
- Six graded simulators write versioned attempts through `assets/student-progress.js` and surface progress in Coach and the hub.
- Shared beginner PPC rules live in `assets/ppc-decision-policy.js` and are documented in `docs/ppc-decision-policy.md`.
- Scenario-bank infrastructure and stable simulator/scenario identity are now present.
- The UI/accessibility foundation and distinct simulator layouts are now merged. The remaining engine/content findings below are still open backlog candidates until individually closed by tests and implementation.

## Executive summary

At the audit date, the project had a strong training concept and broad simulator coverage, but also had two execution-blocking JavaScript syntax errors and several places where displayed metrics did not match the underlying model. The recommended validation gate has since been established; the detailed findings remain useful historical evidence and backlog input.

The review found no source changes were required to produce this report.

## Priority findings

### P0 — Ad Console inline script does not parse

**File:** `ad-console.html:1030`

The completion copy contains `You've` inside a single-quoted JavaScript string without escaping the apostrophe. The browser cannot parse the entire inline script, so the simulator's core interactions do not initialize.

**Fix direction:** escape the apostrophe or use a template literal. Add an automated inline-script parse check to CI so this cannot regress.

### P0 — Pacing Deck inline script does not parse

**File:** `pacing-deck.html:1007`

The string contains `you''ll`. JavaScript does not escape apostrophes by doubling them, so the Pacing Deck script also fails before initialization.

**Fix direction:** use valid escaping or template literals and cover inline scripts with the same parse check.

### Resolved — Ad Console budget caps make search-term data consistent

**File:** `ad-console.html`, `attributeTerms()` and `simHour()`

`attributeTerms()` mutates search-term records immediately. The current `simHour()` implementation snapshots those records before attribution and rolls each delta back to the final cap factor when a campaign exceeds its remaining budget.

This causes the campaign dashboard and search-term report to disagree exactly when a campaign hits its cap—the moment students are expected to learn about budget pacing.

**Verification:** capped segment, campaign, placement, keyword, and search-term deltas are all scaled from the same factor before final state is committed.

### Resolved — BuyBox Dojo cap accounting

**File:** `listing.html:1333-1337`, `listing.html:1369`, `listing.html:1393`

The simulation applies `campaign.budget * 7` as an aggregate cap and distributes the result across seven random days. The UI says the campaign “stopped showing mid-day,” but there is no day-by-day budget exhaustion logic.

**Fix direction:** either simulate each day with a remaining daily budget or change the copy to describe a seven-day allocation cap. Do not teach mid-day pacing from a weekly aggregate model.

### P1 — BuyBox cap scaling leaves CTR internally inconsistent

**File:** `listing.html:1333-1335`

When the cap is applied, clicks, spend, and orders are scaled, but impressions and row CTR are not. Total CTR is then recomputed from scaled clicks divided by unscaled impressions.

**Fix direction:** model eligible versus served impressions, or scale impressions and recompute all dependent metrics consistently.

### Resolved — Bulk File transactional validation

**File:** `bulk-file.html:823`, `848`, `862`, `877`, `902`, `917`, `932`, `956`, `973`

Create rows are inserted into simulated state even when the same row has validation errors. A malformed parent can therefore become available to later child rows, masking dependency and ordering mistakes.

**Fix direction:** build a candidate entity, collect row errors, and commit only when there are no blocking errors. Keep update/delete behavior transactional as well.

### Resolved — BuyBox Dojo simulation reproducibility

**Files:** `ad-console.html`, `listing.html`, and parts of `keyword-lab.html`

BuyBox Dojo now derives a deterministic seed from the scenario and campaign inputs, making repeated runs replayable. Ad Console and Keyword Lab still contain non-graded ambient randomness and remain candidates for the same treatment.

**Fix direction:** use a seeded PRNG keyed by scenario and run seed. Add a “replay same seed” mode and expose the seed in debug/export output.

### P1 — User-controlled values are inserted into dynamic HTML

**Files:** `ppc-coach.html:801-809`, `keyword-lab.html:1173`

PPC Coach renders user messages through `innerHTML`. Keyword Lab places a user-entered negative keyword inside an inline event-handler string. These paths can break markup or execute injected markup in the local app context.

**Fix direction:** render untrusted values with `textContent`, use DOM event listeners, and reserve HTML templates for trusted static content.

## UI and accessibility findings

- Ad Console icon-only controls use `data-tip` tooltips but lack reliable accessible names such as `aria-label`.
- Pacing Deck range inputs use visual labels rather than associated `<label>` elements or equivalent ARIA names.
- The Pacing Deck day-part grid is pointer-driven and lacks keyboard interaction.
- Bulk File instructional help depends on hover, which does not work consistently on touch or keyboard devices.
- Dynamic scores, feedback, and simulation results should use explicit `aria-live` regions where users need immediate status updates.
- Shared table overflow behavior targets `.table-scroll-wrap`, but pages use several different wrapper classes (`.twrap`, `.tblwrap`, `.tbl-wrap`, and Tailwind overflow utilities). Mobile affordances are therefore inconsistent.
- `assets/skin.css` relies heavily on substring selectors such as `[class*="card"]` and `[class*="ticker"]`, which increases the chance of unintended cross-page styling.

## Copy and product consistency findings

- Search Term Triage now describes its 8/12/16-term rounds consistently.
- Keyword Lab displays inconsistent versions between the hub and the simulator.
- The course copy uses 70%, 80%, and 85% thresholds without clearly naming the difference between pass, distinction, and supervised-readiness targets.
- “AI Coach” is presented as a product label, while the implementation is a deterministic keyword-rule matcher. The feature documentation correctly describes it as rule-based; the primary labels should match that reality.
- The marketplace selector is cosmetic. Its handler explicitly reports that the demo data remains on Amazon.com.
- The hub claims the simulator has the “same layout, same controls, same copy” as Seller Central. This should be reframed as a training approximation to avoid overpromising fidelity.
- Tool numbering and suite labels are duplicated across pages and have already drifted (`TOOL 05` through `TOOL 09`, `SIMULATOR 06`, and hub labels).

## Simulation and domain-model findings

- Pacing Deck describes second-price bidding, but the model uses a market-CPC approximation without competitor bids. The copy should call this an approximation or the model should expose competing bids.
- Keyword Lab intentionally gives each keyword its own full daily budget, but aggregate charts use a budget reference that can be interpreted as a portfolio-level budget. The UI should make the per-keyword scope visually explicit.
- Pacing Deck now labels the profile `PH STANDARD`; the demand curve and timezone assumptions still need product review.
- BuyBox Dojo now uses Amazon PH fulfillment copy; stock and Buy Box state remain simulated training data.
- Pacing Deck reports fractional sales from expected-value calculations. Labeling these as “expected conversions” would be more precise than presenting them as actual orders.

## Validation performed

- Parsed all HTML inline scripts with Node's `vm.Script`.
- Confirmed failures in `ad-console.html` and `pacing-deck.html`.
- Confirmed other inline scripts parse successfully.
- Ran `node --check` on shared and desktop JavaScript files successfully.
- Ran `git diff --check` successfully.
- Confirmed there is no configured test script in `package.json`; available scripts are packaging/start commands only.

## Recommended implementation order

1. Fix both syntax errors and add an inline-script parsing gate.
2. Correct budget-cap accounting and align BuyBox cap behavior with its copy.
3. Make Bulk File validation transactional and calendar-date validation strict.
4. Add seeded simulation runs and replayable fixtures.
5. Remove unsafe dynamic HTML and normalize accessible controls.
6. Create a shared content manifest for tool names, versions, counts, thresholds, and labels.
7. Extract pure simulator kernels and shared UI primitives incrementally; avoid a large rewrite until the behavioral contracts are covered.
