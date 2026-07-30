# STORY-080: Replace length-based listing scoring with a real rubric

## Status

**✅ Done — merged in PR #245.** Ryan's third and authoritative
decision pass (2026-07-29). **Supersedes** the two earlier passes (PRs
#241/#242) — the dimension set, category list, imagery schema, scoring
states, and finding volumes all changed from the prior passes. This
document is the one that was implemented against.

Coupled with STORY-083 (still planned) — this story built the rubric
and richer finding generator; STORY-083 still owes the non-binary
ground truth, in the sequence at the bottom of this doc.

**Scope note:** still substantially larger than the original estimate.
See "Suggested split" below.

## Current mechanism (verbatim, `ListingAuditSimulator.ts`)

```ts
let score = Math.min(100, Math.round(title.length / 3)); // title
let score = Math.min(100, Math.round(totalChars / 5)); // bullets
const descriptionScore = Math.min(100, Math.round(description.length / 2));
```

Pure character-count formulas; generator tops out at ~4 findings.

## Decisions (final)

### Audit dimensions and weights

| Dimension                                   | Weight |
| ------------------------------------------- | ------ |
| Compliance and policy risk                  | 25%    |
| Search relevance and customer intent        | 20%    |
| Product accuracy and attribute completeness | 15%    |
| Conversion copy and objection coverage      | 15%    |
| Mobile hierarchy and readability            | 10%    |
| Images and supporting media                 | 15%    |

Relevance, compliance, mobile readability, and category-specific
dimensions are confirmed. Added: accuracy/attribute consistency,
conversion quality, imagery.

### Length: a rule/guardrail, not a linear score generator

- Above the applicable marketplace/category limit → fail that rule.
- Within the valid range → no extra points for padding.
- Short content is only penalized when it omits important attributes,
  intent coverage, or customer information.
- Mobile scoring inspects what appears **early**, not total character
  count.
- Limits come from versioned marketplace/category configuration, not a
  universal hardcoded number.

### Category variants

Launch with one general baseline plus four overlays:

1. General hardlines and Home (baseline)
2. Beauty and personal care
3. Food and supplements
4. Electronics
5. Apparel

Important differences per overlay: regulated claims, ingredients/
allergens, compatibility, power/safety information, size charts,
variation structure, material, dimensions, included components.

### Imagery: structured scenario data, computer vision deferred

```ts
images: Array<{
  slot: number;
  role: "main" | "lifestyle" | "infographic" | "dimensions" | "comparison" | "packaging" | "other";
  whiteBackground: boolean;
  hasTextOverlay: boolean;
  productFillPct: number;
}>;
hasVideo: boolean;
hasAPlus: boolean;
```

Enough to evaluate image count, main-image compliance, role coverage,
lifestyle usage, scale, dimensions, packaging, and supporting media —
without pixel analysis or OCR.

### Scoring model: weighted categorical rule outcomes

```ts
"pass" | "warning" | "fail" | "notApplicable";
```

No continuous character-count scoring. The overall score can be numeric,
but must be assembled from explicit rule outcomes and weights. A valid
critical compliance failure caps the overall listing score regardless of
how polished the copy looks.

### Finding volume

| Difficulty   | Findings |
| ------------ | -------- |
| Beginner     | ~10      |
| Intermediate | ~14      |
| Advanced     | ~18      |

Mix: 10-15% critical, 40-50% warning, 35-45% informational/opportunity.
**At least 30% of findings must correctly require an action other than
"fix now."** Without this, "mark everything fix" remains an accidental
winning strategy — this is the load-bearing number for STORY-083.

## Suggested split

- **STORY-080a:** Rubric schema + weighted-categorical scoring engine
  (dimensions, length-as-gate, pass/warning/fail/notApplicable states,
  critical-gate capping).
- **STORY-080b:** Richer finding generator hitting the volume/mix table,
  with the ≥30%-non-fix-now guarantee.
- **STORY-080c:** Category overlays — General/Home baseline + Beauty,
  Food/Supplements, Electronics, Apparel.
- **STORY-080d:** Imagery schema + scoring.

## Sequencing with STORY-083

1. Rubric schema (this story).
2. Richer finding generation, ≥30% non-fix-now (this story).
3. Contextual ground-truth actions (STORY-083).
4. Graded student decisions (STORY-083).
5. Regression tests (STORY-083).

## Acceptance criteria

- [ ] Title/bullet/description scoring replaced by the weighted-categorical
      rubric above, not character-count proxies
- [ ] Length is a versioned pass/fail gate, not a score driver; short
      content only penalized for missing information
- [ ] All five category variants implemented (baseline + 4 overlays)
- [ ] Imagery fields scored per the schema above, no computer vision
- [ ] Finding generator hits the volume/severity-mix table per difficulty,
      including the ≥30% non-fix-now requirement
- [ ] Critical-gate rules cap the overall score regardless of total
- [ ] Domain tests cover each rubric rule against Ryan-characterized
      example listings
- [ ] Deterministic-replay test: same scenario + engine version → identical
      output
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
