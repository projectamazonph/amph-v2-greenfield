# STORY-080: Replace length-based listing scoring with a real rubric

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules. This
story is coupled with STORY-083 (see that doc) — build the new rubric and
richer finding generator here, and the non-binary ground truth on top of
it there, in the sequence given at the bottom of this doc.

**Scope note:** category rule packs, imagery metadata, and a 12-18-finding
generator are each substantial on their own. Recommend splitting; see
"Suggested split" below.

## Current mechanism (verbatim, `ListingAuditSimulator.ts`)

```ts
let score = Math.min(100, Math.round(title.length / 3)); // title
let score = Math.min(100, Math.round(totalChars / 5)); // bullets
const descriptionScore = Math.min(100, Math.round(description.length / 2));
```

Pure character-count formulas, one niche-substring check, and a
generator that tops out at ~4 findings.

## Decisions

### 1. Real audit dimensions and weights

| Dimension                            | Weight |
| ------------------------------------ | ------ |
| Product and query relevance          | 20%    |
| Customer clarity and comprehension   | 15%    |
| Benefit and differentiation coverage | 15%    |
| Search-term coverage                 | 15%    |
| Compliance and claims risk           | 15%    |
| Mobile and scan readability          | 10%    |
| Conversion-supporting media          | 10%    |

Confirmed: relevance/intent, compliance red flags, mobile readability,
category-specific rules, keyword coverage. Added: differentiation,
conversion clarity, media support (limited initial scope, see item 4).
This is an **AMPH instructional rubric**, not an official Amazon
listing-quality score — do not present it as one.

### 2. Length is a gate, not the score driver

```ts
{ rule: "title_length", result: "pass" | "warning" | "fail", points: 0 | 0.5 | 1 }
```

Length only matters where it affects compliance, truncation, clarity,
missing information, or repetition — not as a linear score driver.

**Verified:** Amazon's title limit drops to 75 characters (most non-media
categories) effective 2026-07-27, with a new 125-character Item Highlights
field (confirmed via public sources, see
`docs/simulator-remediation-decisions.md`). Title rules must be versioned
by marketplace and effective date:

```ts
policyVersion: string;
marketplace: string;
category: string;
effectiveDate: string;
titleMaxChars: number;
```

### 3. Category-specific variants

Launch with three curated category packs (of an eventual eight-category
target list): **Home & Kitchen**, **Beauty and Personal Care**, **Health
and Household**. Each pack covers required-attribute emphasis, claim
sensitivity, size/compatibility/material info, variation handling, safety
statements, prohibited language, title policy, and image expectations.

### 4. Imagery: structured metadata only, no computer vision

```ts
images: Array<{
  type:
    | "main"
    | "lifestyle"
    | "infographic"
    | "dimensions"
    | "comparison"
    | "instructional"
    | "packaging";
  present: boolean;
  hasReadableText?: boolean;
  supportsPrimaryBenefit?: boolean;
}>;
videoPresent: boolean;
aPlusPresent: boolean;
```

Explicitly deferred: pixel analysis, OCR, background detection, any
computer vision.

### 5. Weighted checklist, three states, with hard gates

```ts
"pass" | "partial" | "fail"; // 1.0 / 0.5 / 0.0
isCriticalGate: true; // a listing cannot pass advanced with a missed critical-gate rule, regardless of total score
```

Chosen over continuous per-rule scoring: easier to author, test, explain,
and calibrate.

### 6. Findings per listing

| Difficulty   | Findings |
| ------------ | -------- |
| Beginner     | 6-8      |
| Intermediate | 9-12     |
| Advanced     | 12-18    |

Intermediate severity mix: 1-2 critical, 3-5 warning, 3-5 info/optimization,
**1-2 deliberate non-issues** the student should leave alone. The
deliberate non-issues are load-bearing for STORY-083 — without them,
"fix everything" stays a viable shortcut.

## Decision-pack refinements (implementation-ready, 2026-07-29 second pass)

Each rule is a stable, identifiable record, not an inline computation:

```ts
{
  ruleId: string;
  dimension: /* one of the 7 dimensions above */ ;
  result: "pass" | "partial" | "fail";
  points: 1.0 | 0.5 | 0.0;
  weight: number;
  severity: "critical" | "warning" | "info";
  isCriticalGate: boolean;
  message: string;
  suggestion: string;
  marketplace: string;
  category: string;
  policyVersion: string;
  effectiveDate: string; // ISO date
}
```

Every generated finding carries a stable `ruleId` **and** `findingId` —
required for STORY-083 to reference specific rules in its ground-truth
mapping, and for regression tests to assert against a fixed identifier
rather than array position.

Required tests:

- A longer but repetitive title does not outperform a concise, relevant
  one (proves length alone can't drive score).
- Category-specific rules activate only for the matching
  category/marketplace.
- A critical compliance gate blocks advanced-difficulty passing.
- Image metadata changes the media dimension score.
- Published rule packs are immutable by version.
- Finding counts/severity mix stay within the configured scenario ranges.

## Suggested split

- **STORY-080a:** Rubric schema + weighted-checklist scoring engine
  (items 1, 2, 5).
- **STORY-080b:** Richer finding generator, 6-18 findings with deliberate
  non-issues (item 6).
- **STORY-080c:** Category packs — Home & Kitchen, Beauty, Health &
  Household (item 3).
- **STORY-080d:** Imagery metadata fields + scoring (item 4).

## Sequencing with STORY-083

1. New rubric schema (this story).
2. Richer finding generation (this story).
3. Contextual ground-truth actions (STORY-083).
4. Graded student decisions (STORY-083).
5. Regression tests (STORY-083).

Do not build STORY-083's ground truth against the old character-count
findings — it would bake weak ground truth into the new action system.

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] Title/bullet/description scoring replaced by the weighted-checklist
      rubric above, not character-count proxies
- [ ] Title-length gate versioned by marketplace/effective date, matches
      the verified 75-character policy
- [ ] Three category packs implemented (Home & Kitchen, Beauty, Health &
      Household)
- [ ] Imagery fields added per item 4, scored, not analyzed
- [ ] Finding generator produces 6-18 findings per the severity mix table,
      including deliberate non-issues
- [ ] Critical-gate rules block advanced-difficulty passing regardless of
      total score
- [ ] Domain tests cover each rubric rule against Ryan-characterized
      example listings (good/mediocre/bad)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
