# STORY-083: Non-binary, category-aware Listing Audit ground truth

## Status

**Done — 2026-08-04.** Implements Ryan's third and authoritative decision
pass (2026-07-29) below verbatim. See "What shipped" for the concrete
implementation and how it maps onto the decisions.

## Current mechanism (verbatim, `ListingAuditSimulator.ts:groundTruthAction`)

```ts
function groundTruthAction(severity: FindingSeverity): FindingAction {
  return severity === "info" ? "skip" : "fix";
}
```

Pure function of severity. Post-Sprint-14, "mark everything fix" still
passes at every difficulty.

## Decisions (final)

### Actions

```ts
type FindingAction = "fixNow" | "defer" | "skip" | "escalate";
```

Ground truth stored explicitly per finding:

```ts
{
  expectedAction: FindingAction;
  acceptedActions: FindingAction[];
  rationale: string;
  evidenceRefs: string[];
}
```

Severity describes potential impact. **It must not determine the action
by itself.**

### Valid skip cases (warnings can absolutely be skipped)

- **Relevance:** an exact keyword is absent, but a clear synonym already
  covers the intent and adding it would create keyword stuffing.
- **Compliance:** "BPA-free" is incorrectly flagged as promotional use of
  "free."
- **Mobile:** a title is long, but the first-screen portion clearly
  identifies the product and the remaining text carries required
  compatibility information.
- **Apparel:** product dimensions are absent, but a complete
  category-appropriate size chart is present.
- **Electronics:** model compatibility isn't in the title but is fully
  covered in the first bullet and a compatibility table.
- **Imagery:** six images instead of seven, but every required image role
  is present and the category has no seven-image requirement.

A genuine critical violation should not be skipped. A critical candidate
may be skipped only when it's an explicit false positive or not
applicable (e.g. a crude detector flags "alcohol-free" as prohibited
alcohol content). **If compliance is uncertain rather than disproven, the
correct action is `escalate`**, not `skip`.

### Additional signals (`ListingScenarioContext`)

```ts
marketplace: string;
categoryId: string;
productType: string;
structuredAttributes: Record<string, unknown>;
variationTheme: string;
primaryCustomerIntent: string;
primaryKeywords: string[];
images: /* per STORY-080's imagery schema */;
hasAPlus: boolean;
listingStrategy: string;
currentPerformance: Record<string, unknown>;
complianceEvidence: Record<string, unknown>;
```

Rules: marketplace and category determine whether a rule applies.
Structured attributes and variation data prevent false
missing-information findings. Imagery data determines whether an image
recommendation is valid. Verified compliance evidence can disprove a
false positive. Current performance and strategy affect priority or
deferral, but **never excuse a real policy violation.** Ambiguous
regulated claims are escalated, never guessed. Strong performance may
justify deferring a low-impact conversion experiment, not skipping
compliance work.

### Delivery relationship

Deliver STORY-080 and STORY-083 as one reviewed vertical slice. They can
remain separate PRs/stories, but STORY-083 depends on STORY-080's finding
schema and richer scenario set — do not build against the old
character-count findings.

### Mandatory regression tests

- Marking everything `fixNow` scores below the beginner passing
  threshold.
- Marking everything `skip` also fails.
- Skipping a required critical fix caps or fails the attempt.
- Each assessment scenario contains more than one valid action type.
- Severity changes alone do not silently rewrite expected actions.

## Suggested split (as-shipped: 083a and 083b landed together, 083c inline)

- **STORY-083a:** `FindingAction` (4-action set) + `ListingScenarioContext`
  schema.
- **STORY-083b:** Context-dependent ground-truth rules, encoding the six
  concrete skip cases + the critical-violation exception above.
- **STORY-083c:** The 5 mandatory regression tests — kept in the same
  domain test file rather than a separate PR (small enough to review
  together), but each written as an independently-readable test.

## What shipped

Delivered as one slice against `docs/simulator-remediation-decisions.md`'s
own recommendation, on top of STORY-080's `RULES`/finding generator
(untouched — STORY-083 is a separate resolution layer:
`resolveExpectedAction(finding, ctx)` in `ListingAuditSimulator.ts`, keyed
by `finding.ruleId`, not severity).

- `FindingAction` is the exact 4-value set. `GradedFinding` carries
  `expectedAction`/`acceptedActions`/`rationale`/`evidenceRefs`.
  `ListingScenarioContext` is defined in `ListingAuditOutput.ts` with all
  12 documented fields; `ListingAuditInput` gains the corresponding
  optional fields (all defaulted, matching STORY-080's precedent for
  `images`/`hasVideo`/`hasAPlus`).
- The six skip cases map onto 5 existing STORY-080 rules (`niche_in_title`,
  `prohibited_superlative_claims`, `title_front_loaded`,
  `category_required_attributes` — used for both the apparel and
  electronics cases — and `image_count_sufficient`), each checking the
  specific context field(s) that would actually disprove the finding.
  `prohibited_superlative_claims` stands in for the "BPA-free flagged as
  promotional 'free'" example — the current rule set has no literal
  claims-on-the-word-'free' rule, so the closest real analog (a
  non-critical claims rule) was used, documented inline.
- The critical-escalate exception applies to the 5 rules with real
  Amazon-compliance/suppression risk (`title_length_limit`,
  `prohibited_medical_claims`, `category_prohibited_claims`,
  `main_image_present`, `main_image_white_background`): no
  `complianceEvidence` entry → `fixNow` only; an entry prefixed
  `"disproven: ..."` → `skip`; any other documented-but-unresolved
  evidence → `escalate`. `skip` is never in `acceptedActions` for these
  five without a `"disproven:"` entry.
- `direction` scoring: correct means `userChoice ∈ acceptedActions`, not
  an exact match. `priorityCoverage`'s F1 generalizes from "must-fix" to
  "must be `fixNow`", same formula and severity weighting as before.
- All 5 mandatory regressions pass (see
  `tests/unit/domain/simulator/listing-audit/ListingAuditSimulator.test.ts`),
  plus one domain test per skip case (verified end-to-end through
  `simulator.run()`, not just the resolver in isolation) and 3 tests for
  the critical-escalate exception (no evidence / disproven / ambiguous).
- App layer (`scenarioContent.ts`, `seed-simulator-scenarios.ts`,
  `actions.ts`, `ListingAuditForm.tsx`) threads the new context fields
  end-to-end; the bamboo-cutting-board seed scenario got concrete
  (agent-authored, not Ryan-reviewed) values for the new fields — only the
  engine _rules_ needed Ryan's judgment, scenario metadata is ordinary
  content.

## Acceptance criteria

- [x] Built on top of STORY-080's rubric/findings, not the old
      character-count findings
- [x] `FindingAction` is exactly `fixNow` | `defer` | `skip` | `escalate`
- [x] Ground truth carries `expectedAction`/`acceptedActions`/`rationale`/
      `evidenceRefs` per finding
- [x] `ListingScenarioContext` implemented with all fields above
- [x] Ground truth depends on severity + category + context, not severity
      alone
- [x] All 5 regression tests pass
- [x] Domain tests cover each of the 6 concrete skip cases plus the
      critical-violation exception
- [x] Deterministic-replay test: same scenario + engine version → identical
      output (pre-existing test in the same file, unaffected by this story)
- [x] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge — pushed to
      `claude/remaining-tasks-qfuq0b`; no PR opened yet per this session's
      workflow (PRs are only opened when explicitly requested)
