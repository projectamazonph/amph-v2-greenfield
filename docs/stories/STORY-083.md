# STORY-083: Non-binary, category-aware Listing Audit ground truth

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules. **This
is the story that actually closes the click-through bypass** — build it
on top of STORY-080's new rubric/findings, in the sequence given there,
not on the old character-count findings.

**Scope note:** a 7-action ground-truth system with context-dependent
rules and 6 new regression tests is more than one story. Recommend
splitting; see "Suggested split" below.

## Current mechanism (verbatim, `ListingAuditSimulator.ts:groundTruthAction`)

```ts
function groundTruthAction(severity: FindingSeverity): FindingAction {
  return severity === "info" ? "skip" : "fix";
}
```

Pure function of severity. Measured against the real simulator (post
Sprint 14), "mark everything fix" still passes at every difficulty
(beginner 75 vs. 70 threshold, advanced 82 vs. 75).

## Decisions

### 1. Concrete cases where severity does not determine the correct action

- **Title lacks a secondary keyword (warning) → correctly skip** when the
  keyword is covered naturally in bullets/Item Highlights, adding it would
  hurt readability, and the title already meets policy + primary intent.
- **Only 4 bullets (warning) → correctly skip** when they fully cover the
  decision-driving info, a 5th would be repetitive, and category rules
  don't require 5.
- **No comparison image (warning) → correctly skip** when there's no
  meaningful comparison set or other images already communicate value.
- **Short description (warning) → correctly skip** when A+ Content covers
  it, the product is simple, or the description already answers the
  essential purchase questions.
- **Potential medical claim (critical) → `escalate_compliance`**, not a
  direct edit — needs legal/compliance review.
- **Main image may violate category policy (critical) →
  `escalate_creative`** if the student doesn't control creative assets.
- **Uncertain product compatibility (critical) → `request_information`**
  — inventing compatibility data would be worse than leaving it.
- **Brand name mismatch (critical) → `escalate_catalog`**, not a copy
  edit — needs catalog authority or brand-registry intervention.

### 2. Expand beyond fix/skip

```ts
type FindingAction =
  | "fix_now"
  | "defer"
  | "accept"
  | "request_information"
  | "escalate_compliance"
  | "escalate_catalog"
  | "escalate_creative";
```

`skip` is dropped because it conflates "the finding is wrong," "valid but
low priority," "another team owns it," and "needs more information" —
four different situations that need different feedback.

### 3. Additional ground-truth signals

```ts
type ListingScenarioContext = {
  marketplace: string;
  category: string;
  policyVersion: string;
  strategy: "launch" | "conversion_recovery" | "ranking" | "defense" | "maintenance";
  currentConversionRate?: number;
  categoryBenchmarkCvr?: number;
  currentSessions?: number;
  currentSales?: number;
  imageCount: number;
  imageTypes: string[];
  videoPresent: boolean;
  aPlusPresent: boolean;
  sellerHasEditAuthority: boolean;
  creativeAssetsAvailable: boolean;
  complianceReviewRequired: boolean;
  missingProductData: string[];
};
```

Example rules: compliance-risk finding + `complianceReviewRequired` →
`escalate_compliance`. Missing compatibility + `missingProductData`
includes compatibility → `request_information`. Weak imagery +
`creativeAssetsAvailable` → `fix_now`; weak imagery + no assets available
→ `escalate_creative`. Minor secondary-keyword gap + above-benchmark
conversion + `maintenance` strategy → `accept` or `defer`.

### 4. Coupled with STORY-080

Deliver together, in this order: rubric schema → richer finding
generation (STORY-080) → contextual ground-truth actions → graded student
decisions (this story) → regression tests.

### 5. Mandatory regression tests

```ts
it("marking every finding fix_now does not pass beginner mode", ...)
it("marking every finding accept does not pass", ...)
it("severity alone cannot determine every ground-truth action", ...)
it("at least one scenario contains a valid accept action", ...)
it("at least one scenario contains a valid escalation action", ...)
it("at least one scenario contains a request-information action", ...)
```

For a balanced beginner scenario, "fix everything" must score below 70%.

## Decision-pack refinements (implementation-ready, 2026-07-29 second pass)

**Design change from the first decision pass:** ground truth is not a
single correct action per finding. Each finding's ground-truth rule
declares a _set_ of allowed actions plus one preferred action, and
scoring gives partial credit for a defensible-but-not-preferred choice:

```ts
{
  ruleId: string;
  findingId: string;
  allowedActions: FindingAction[];
  preferredAction: FindingAction;
  conditions: /* structured predicates over ListingScenarioContext */;
  rationale: string;
  businessImpact: string;
  severity: "critical" | "warning" | "info";
  policyVersion: string;
}
```

Scoring: full credit for `preferredAction`, partial credit for any other
member of `allowedActions`, zero credit for anything outside it. Critical
gates may require a _specific_ escalation or `request_information` path
rather than accepting any allowed action. This scores judgment about
consequences and ownership, not a simple severity-to-action lookup.

Required tests (supersedes/extends the six regression tests from the
first pass):

- Marking every finding `fix_now` scores below the beginner passing
  threshold.
- Marking every finding `accept` does not pass.
- Severity alone cannot derive every preferred action.
- At least one published scenario contains a valid `accept` action.
- At least one published scenario contains a valid escalation action.
- At least one published scenario contains a `request_information`
  action.
- A balanced beginner scenario keeps "fix everything" below 70%.

## Suggested split

- **STORY-083a:** `FindingAction` expansion + `ListingScenarioContext`
  schema (items 2, 3).
- **STORY-083b:** Context-dependent ground-truth rule implementation,
  encoding the concrete cases from item 1.
- **STORY-083c:** The 6 mandatory regression tests (item 5) — small, but
  keep as its own PR so it's reviewable as the literal proof the bypass
  is closed.

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] Built on top of STORY-080's rubric/findings, not the old
      character-count findings
- [ ] `FindingAction` expanded to the 7-action set; `skip` removed
- [ ] `ListingScenarioContext` implemented with all fields above
- [ ] `groundTruthAction()` depends on severity + category + context, not
      severity alone
- [ ] All 6 regression tests from item 5 pass, including "fix everything
      scores below 70% on beginner"
- [ ] Domain tests cover each of the 8 concrete cases from item 1
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
