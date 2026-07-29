# Simulator remediation: cross-cutting decisions

**Recorded:** 2026-07-29, from Ryan's decision set for Sprint 15
(STORY-079 through STORY-084). These rules apply to every story in that
set and are referenced from each story doc rather than repeated in each
one.

## Versioning: every attempt persists its full lineage

```ts
scenarioId: string;
scenarioVersion: string;
rubricVersion: string;
datasetId?: string;
datasetVersion?: string;
policyVersion: string;
engineVersion: string;
```

A dataset, rubric, or engine update must never silently change the
expected answer for an attempt already graded. Scenario versions are
immutable after publication.

## No unversioned magic constants

Any default threshold, elasticity, or modifier must be:

- Named (not an inline literal)
- Stored in the scenario or policy, not hardcoded in the simulator
- Versioned
- Documented for instructors
- Overrideable by difficulty or category

This directly replaces the current pattern (`const CTR = 0.02`, `const
avgSpendPerKeyword = 25`, `VISIBLE_COPY_NEARLY_FULL_CHARS = 1800`) that the
2026-07-26 audit flagged as unexplained literals.

## Separate observed data from assumptions

```ts
observed: {
  clicks: number;
  orders: number;
  spend: number;
}
assumptions: {
  expectedCvr: number;
  elasticity: number;
  minimumClicks: number;
}
```

Scenario authoring and simulator grading must not blur what the scenario
actually reports against what the engine assumes to compute a ground
truth.

## Credential-mode gate

None of the rebuilt simulators enter credential mode (results counted
toward certification/job-readiness, per STORY-078) until **all** of:

1. Explanation placeholders are removed (done, Sprint 14).
2. "Select everything" / click-through bypasses are regression-tested shut.
3. A human PPC reviewer (Ryan) has calibrated at least 10 scenarios per
   simulator.
4. Acceptable-answer ranges are documented per scenario.
5. Scenario versions are immutable after publication.

## Verified external claims

One factual claim in the decision set was checked against public sources
since it's dated conspicuously close to "today" (2026-07-29): Amazon's
75-character title limit for most non-media categories, effective
2026-07-27, with a new 125-character Item Highlights field, is real and
matches the decision set's description. Source:
[ppc.land](https://ppc.land/amazon-cuts-product-title-limit-to-75-characters-on-july-27/),
[Zentail](https://www.zentail.com/blog/amazon-is-cutting-product-titles-to-75-characters-heres-what-sellers-need-to-know).
Other Amazon-platform claims in the decision set (dynamic bidding
adjustment caps, negative match-type mechanics, multi-match-type bidding
behavior) were not independently re-verified in this pass — treat them as
Ryan's domain assertions, versioned via `policyVersion`/`effectiveDate`
fields precisely so a future correction doesn't require a code change.

## Scope note

This decision set is substantially larger than the 7-point budget
Sprint 15 was planned against in `docs/sprint-plan.md`. Concretely:
STORY-079 now includes a full auction-response-curve model with
elasticities; STORY-080 adds category-specific rule packs plus structured
imagery metadata; STORY-081 requires curating 10 real datasets across 5
categories; STORY-082 adds existing-target/negative-conflict detection;
STORY-083 is explicitly coupled to STORY-080's finding generator plus six
new regression tests; STORY-084 adds a full naming-convention and
budget-reconciliation system. Each of these is closer to a 3-5 point story
on its own than the original 1-point estimate.

Per `docs/sprint-plan.md`'s "When a Story Splits" rule (a story whose code
shape exceeds ~150 lines, or whose pitfalls exceed 3 items, should split
into sub-stories rather than being silently absorbed), each of
STORY-079 through STORY-084 should be re-split before implementation
starts. See each story doc's updated "Suggested split" section.
