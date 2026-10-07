# Amazon PH Simulators Platform Implementation Plan

**Repository:** `projectamazonph/amazon-ph-simulators`  
**Baseline:** `master` after PR #40, with 113 passing tests  
**Planning principle:** strengthen the local-first product before adding a backend

## 1. Executive direction

The platform should evolve from a collection of static simulator pages into a **local-first learning system** with shared assessment contracts, validated content, durable progress, offline reliability, and measurable learner outcomes. The recommended order is deliberate:

> First make the assessment engine trustworthy and the learner experience reliable. Then add synchronization, instructor reporting, and analytics on top of stable data contracts.

The first release train should not begin with accounts or a backend. The current application already has a useful curriculum manifest, reusable grading engines, versioned attempts, and an Electron distribution path. The highest leverage comes from standardizing those foundations and removing the current page-by-page divergence.[1] [2] [3]

## 2. Target architecture

The target architecture has five layers:

| Layer             | Responsibility                                                                                                           | Target artifacts                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Content           | Scenario definitions, learning objectives, options, rubrics, feedback, difficulty, misconceptions, and localization keys | `content/scenarios/*.json`, `content/modules/*.json`, JSON Schema             |
| Domain grading    | Pure deterministic grading, metric calculations, policy decisions, rubric versioning                                     | `assets/graders/*.js`, `assets/policies/*.js`                                 |
| Application state | Attempts, progress, migrations, export/import, local event log                                                           | `assets/progress/*.js`, versioned schemas                                     |
| Presentation      | Shared simulator renderer, page shell, dashboard, feedback, accessibility behavior                                       | `assets/ui/*.js`, thin HTML entry points                                      |
| Delivery          | Web deployment, Electron packaging, offline assets, release/update workflows                                             | `.github/workflows`, `assets/vendor`, service worker, installer configuration |

Every simulator should eventually expose one standard descriptor:

```js
{
  (simulatorId,
    scenarioId,
    scenarioVersion,
    rubricVersion,
    policyVersion,
    difficulty,
    skills,
    passingScore,
    gradeAttempt(input),
    renderFeedback(result));
}
```

## 3. Workstream A — Define contracts and success metrics

### A1. Establish the result contract

Create a shared result schema for all simulators. It must define `score`, `maxScore`, normalized percentage, `passed`, `correctDecisions`, `totalDecisions`, `items`, and summary levels. Every item should identify its row or question, earned points, possible points, expected answer category, selected answer, evidence, feedback, and misconception code where applicable.

**Acceptance criteria:** every current modular grader conforms; inline simulators receive adapters; malformed result objects fail validation in tests.

### A2. Define version semantics

Separate the following concepts explicitly: scenario version, rubric version, policy version, application schema version, and progress-state version. A score must be reproducible from the version identifiers stored with the attempt.

**Acceptance criteria:** changing a policy or rubric requires a version change; historical attempts remain interpretable; migration tests cover at least one prior state version.

### A3. Establish product metrics

Track product quality separately from learner outcomes. Suggested metrics are:

| Category           | Metrics                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Reliability        | Offline completion rate, crash rate, failed asset load rate, progress recovery success             |
| Assessment quality | Grading disagreement rate, ambiguous-item rate, pass-rate distribution, repeat-attempt improvement |
| Learning           | Time to first pass, skill-level mastery, misconception recurrence, abandonment by step             |
| Delivery           | Build success rate, installer smoke-test success, update success, release rollback rate            |

The metrics should be defined before analytics implementation so the platform does not collect data without a decision purpose.

## 4. Workstream B — Establish the content and grading foundation

### B1. Introduce a validated scenario schema

Move scenario data out of large inline HTML files and into validated JSON or YAML. The schema should require identity, versions, difficulty, learning objectives, skills, answer options, expected answers, point weights, feedback, and accessibility labels.

Add a `npm run validate-content` command that checks duplicate IDs, missing references, invalid score totals, unknown options, inconsistent passing thresholds, and unavailable simulator IDs.

**Dependencies:** A1 and A2.  
**Acceptance criteria:** CI rejects invalid content; all currently published modular scenarios validate; generated metadata matches `curriculum-manifest.js`.

### B2. Add misconception codes

Every incorrect answer should map to a reusable misconception such as `premature_scale`, `insufficient_evidence`, `listing_conversion_blindness`, `poor_priority_order`, or `missing_client_guardrail`. This enables targeted feedback and skill analytics later.

**Acceptance criteria:** at least two misconception codes exist for every migrated simulator; feedback tests verify that the expected code is returned for representative wrong answers.

### B3. Version policy-derived rubrics explicitly

Continue the current `policyVersion` approach, but make policy dependency declarative in scenario content rather than inferred from module code. A scenario should declare which policy and policy version it uses. The content validator should reject policy-coupled scenarios without a policy version.

## 5. Workstream C — Test and quality foundation

### C1. Add browser-level testing

Introduce a browser test harness for two representative pages: one modular simulator, preferably Bid Decisions, and one migrated inline simulator, preferably Search Term Triage. The first test suite should cover:

| Test flow   | Required assertions                                                 |
| ----------- | ------------------------------------------------------------------- |
| Load        | Page opens without console errors; required controls are present    |
| Completion  | User answers all rows and sees score, pass state, and feedback      |
| Persistence | Attempt is stored and visible on the hub after reload               |
| Reset       | Reset clears page-local state without corrupting global progress    |
| Keyboard    | Main interaction path works without a mouse                         |
| Mobile      | No horizontal overflow; controls remain usable at a narrow viewport |

### C2. Add accessibility checks

Add automated checks for labels, button names, focus visibility, heading order, contrast, live-region announcements, reduced-motion behavior, and modal focus trapping. Treat severe accessibility violations as CI failures.

### C3. Replace source-regex tests progressively

Keep source-contract tests for static guarantees such as script inclusion and packaging contents, but replace behavior-sensitive regex assertions with pure grader tests or browser tests. The ratio of behavioral tests to source-contract tests should increase each time an inline simulator is migrated.

### C4. Add coverage thresholds

The current suite passes 113 tests, but coverage is not enforced as a build gate. Add minimum thresholds, initially lower than current measured values to avoid blocking legitimate changes: 90% lines, 75% branches, and 95% functions for domain modules. Raise the thresholds after the browser layer is established.

## 6. Workstream D — Migrate inline simulators

Migrate in the following order:

| Sequence | Simulator     | Reason                                                                          |
| -------: | ------------- | ------------------------------------------------------------------------------- |
|        1 | Keyword Lab   | Large page, meaningful grading, high reuse potential for question-bank patterns |
|        2 | AdConsole Pro | Central campaign-setup path and likely curriculum dependency                    |
|        3 | Bulk File     | Spreadsheet interaction and import/export behavior need isolated tests          |
|        4 | BuyBox Dojo   | Large page with simulation state and quiz logic                                 |
|        5 | Pacing Deck   | Complex simulation loop and time/pacing behavior                                |
|        6 | Listing       | Large page with multiple embedded learning activities                           |

For each simulator, use the same migration sequence:

1. Identify state, questions, grading, feedback, and persistence boundaries.
2. Extract pure data and grading functions without changing visible behavior.
3. Add characterization tests for current behavior.
4. Create a scenario descriptor and version it.
5. Replace inline grading with the shared engine or a dedicated domain grader.
6. Replace page-specific progress calls with the shared progress adapter.
7. Add browser coverage for the learner completion flow.
8. Remove dead inline logic and update the page contract tests.

**Definition of done:** no grading decisions remain embedded in the page template; the page can be rendered with a thin controller; pure grading tests and one browser completion test pass.

## 7. Workstream E — Offline capability and data durability

### E1. Vendor runtime dependencies

Move Chart.js, SheetJS, Tailwind-generated runtime dependencies, and required fonts into pinned local assets where licensing permits. Add a test that rejects unapproved production CDN references. Keep external links only for explicitly user-selected navigation or documentation.

### E2. Add web offline caching

For the GitHub Pages version, add a service worker that caches the application shell, simulator assets, fonts, and learning content. Use cache versioning and an explicit update strategy so stale content does not silently persist.

### E3. Add progress export/import

Implement a local-first backup feature with:

- schema version and application version;
- attempt history and policy/rubric metadata;
- checksum or integrity field;
- preview before import;
- merge and replace modes;
- malformed-record rejection;
- clear success and failure messaging.

Add tests for duplicate attempts, newer versus older scores, incompatible schema versions, and partially corrupt files.

### E4. Add a local event log

Before remote analytics, record privacy-safe local events such as simulator started, row answered, attempt completed, export created, and import restored. Keep the log bounded and exportable. Do not record real customer account data or unnecessary identifiers.

## 8. Workstream F — Learner experience and content operations

### F1. Add skill-level progress

Extend curriculum metadata so each practice maps to skills. The hub should show a skill heatmap, strongest and weakest skills, and the next recommended practice. A failed attempt should recommend a targeted retry rather than simply displaying “try again.”

### F2. Add misconception-driven feedback

After grading, group missed items by misconception. Example: “You made three premature-scaling decisions and two insufficient-evidence decisions.” This is more actionable than a single total score.

### F3. Add adaptive sequencing

Use prerequisites and performance history to recommend module order. Keep the first version deterministic and local: no machine learning is required. A simple rule engine is sufficient.

### F4. Add authoring workflow

Provide a content-preview command or small authoring interface that renders a scenario exactly as learners will see it. Require content reviewers to approve scenario text, expected answers, score weights, and feedback before release.

## 9. Workstream G — Security, CI/CD, and releases

### G1. Separate CI permissions

Change pull-request and ordinary branch builds to read-only permissions. Create a separate tag-only release job with write access for GitHub Releases. This limits the blast radius of untrusted pull-request code.

### G2. Add CSP and safe rendering

Introduce a restrictive Content Security Policy, then migrate inline scripts toward external modules. Centralize text escaping and sanitization for imported or user-generated content. Keep Electron navigation restrictions and permission controls covered by tests.

### G3. Harden release artifacts

Add packaged-app smoke tests, checksums, signed Windows installers, version/tag consistency checks, and a staged release channel. Release acceptance should verify that the installer launches offline, preserves progress across update, and serves all required local assets.

### G4. Add observability for failures

Add a local error boundary that captures non-sensitive diagnostics for export. If remote error reporting is later introduced, require opt-in or a clear privacy policy and strip learner content from event payloads.

## 10. Workstream H — Optional synchronization and instructor platform

This workstream should begin only after local persistence, versioning, and assessment contracts are stable.

### H1. Define the cloud data model

Use the existing attempt record as the base, adding learner identity, cohort, device, synchronization timestamp, and conflict metadata. Never overwrite a higher valid score with a lower score. Preserve attempt history for auditability.

### H2. Add authentication and roles

Support learner, instructor, and administrator roles. Instructors should see only assigned cohorts. Learners should control export and deletion of their own data.

### H3. Add synchronization conflict rules

Use append-only attempts plus derived progress summaries. Sync should be idempotent, tolerate offline retries, and resolve duplicates by stable attempt IDs rather than timestamps alone.

### H4. Build instructor reporting

The first dashboard should show completion, pass rate, skill mastery, misconception distribution, and learners requiring support. Avoid exposing individual answers unless the product has a clear pedagogical reason.

### H5. Add privacy-preserving analytics

Collect only events needed for defined product questions. Establish retention, deletion, consent, and aggregation rules before enabling remote collection.

## 11. Release roadmap

### Release R1 — Reliability baseline

**Goal:** protect learner progress and make the application testable and offline-capable.

Deliver the shared simulator result contract, content validation skeleton, browser tests for two simulators, accessibility smoke checks, local dependency bundling, progress export/import, and CI permission separation.

**Exit criteria:** all existing simulators continue to pass; two browser flows pass in web and packaged contexts; offline launch succeeds; export/import restores progress; CI pull requests have no write permissions.

### Release R2 — Architecture consolidation

**Goal:** reduce maintenance cost and make grading changes safe.

Migrate Keyword Lab, AdConsole Pro, and Bulk File. Move their content into validated scenario files, add misconception codes, enforce coverage thresholds, and remove duplicate persistence logic.

**Exit criteria:** three migrated simulators conform to the shared descriptor; no grading logic remains in their HTML; pure and browser tests cover normal, edge, and reset flows.

### Release R3 — Learning effectiveness

**Goal:** turn completion tracking into adaptive instruction.

Add skill tagging, misconception-driven feedback, next-best-practice recommendations, spaced retry prompts, and content preview tooling.

**Exit criteria:** every curriculum module maps to skills; learner dashboard can recommend a next activity; feedback identifies at least one actionable misconception after failure.

### Release R4 — Distribution hardening

**Goal:** make public web and desktop releases predictable and secure.

Add CSP, signed installers, artifact checksums, packaged-app smoke tests, staged release channels, offline service-worker caching, and failure diagnostics.

**Exit criteria:** release artifacts are signed and reproducible; packaged app passes offline and update tests; no unapproved runtime CDN references remain.

### Release R5 — Optional cloud platform

**Goal:** support cohorts and instructors without weakening the local-first experience.

Add authentication, sync, instructor reporting, consent management, and privacy-preserving analytics.

**Exit criteria:** offline attempts sync idempotently; permissions are enforced; learners can export/delete data; instructor reports reconcile with raw attempts.

## 12. Ownership model

| Role                | Primary responsibility                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| Platform engineer   | Shared contracts, progress, offline behavior, CI/CD, Electron, release security    |
| Assessment engineer | Grading engines, policies, rubrics, versioning, test fixtures                      |
| Frontend engineer   | Shared renderer, dashboard, accessibility, mobile behavior                         |
| Content lead        | Scenario quality, learning objectives, misconceptions, feedback, review workflow   |
| QA engineer         | Browser flows, accessibility, offline, packaged-app smoke tests, regression matrix |
| Product owner       | Success metrics, sequencing, learner/instructor priorities, privacy decisions      |

A small team can combine these roles, but ownership should remain explicit. The highest-risk failure mode is allowing content changes, grading changes, and UI changes to merge without a clear owner for assessment validity.

## 13. Main risks and mitigations

| Risk                                         | Consequence                                      | Mitigation                                                          |
| -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Migration changes learner scores             | Loss of trust and invalid historical comparisons | Characterization tests, rubric versions, parallel comparison mode   |
| CDN removal breaks styling or charts         | Offline and web regressions                      | Asset manifest, visual snapshots, offline smoke tests               |
| Sync arrives before data contracts stabilize | Irreversible cloud schema churn                  | Delay backend until R2/R3 exit criteria are met                     |
| Analytics collects sensitive data            | Privacy and trust failure                        | Data minimization, opt-in design, retention policy, redaction tests |
| Large migration becomes a rewrite            | Long delivery cycle and merge conflicts          | One simulator at a time, preserve visible behavior first            |
| Content schema becomes bureaucratic          | Slower curriculum iteration                      | Provide preview tooling and generated fixtures, keep schema focused |

## 14. Immediate first sprint

The first sprint should be intentionally narrow:

| Task                                                 | Output                                               |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Define the universal result and simulator descriptor | `docs/simulator-contract.md`, schema tests           |
| Add a content schema skeleton                        | `content/schema/scenario.schema.json`                |
| Choose and configure browser testing                 | One test command and one representative browser flow |
| Add progress export/import design                    | Data format proposal and migration tests             |
| Split CI permissions                                 | Read-only PR build; tag-only release permissions     |
| Inventory and pin runtime dependencies               | Approved dependency manifest and offline risk list   |

The sprint should end with a technical design review, not a broad implementation push. Once these contracts are accepted, the remaining work can proceed in parallel without repeatedly redefining the data model.

## References

[1]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/assets/decision-simulator-core.js "Shared decision grading engine"
[2]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/assets/curriculum-manifest.js "Curriculum manifest"
[3]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/assets/student-progress.js "Versioned progress persistence"
[4]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/assets/simulator-attempt.js "Attempt normalization"
[5]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/desktop/main.cjs "Electron runtime security and lifecycle"
[6]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/.github/workflows/build-windows-installer.yml "Windows installer CI/CD workflow"
[7]: https://github.com/projectamazonph/amazon-ph-simulators/tree/master/tests "Current automated tests"
[8]: https://github.com/projectamazonph/amazon-ph-simulators/blob/master/package.json "Application and build configuration"
