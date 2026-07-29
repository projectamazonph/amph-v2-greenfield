# STORY-083: Non-binary, category-aware Listing Audit ground truth

## Status

**Final — ready for implementation.** Ryan's third and authoritative
decision pass (2026-07-29). **Supersedes** the two earlier passes (PRs
#241/#242) — the action set is renamed and simplified to four camelCase
actions (`fixNow`/`defer`/`skip`/`escalate`), not the earlier 7-action
snake_case set. This is the story that actually closes the click-through
bypass; build it on STORY-080's rubric/findings, not the old
character-count findings.

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

## Suggested split

- **STORY-083a:** `FindingAction` (4-action set) + `ListingScenarioContext`
  schema.
- **STORY-083b:** Context-dependent ground-truth rules, encoding the six
  concrete skip cases + the critical-violation exception above.
- **STORY-083c:** The 5 mandatory regression tests — keep as its own PR
  so it's reviewable as the literal proof the bypass is closed.

## Acceptance criteria

- [ ] Built on top of STORY-080's rubric/findings, not the old
      character-count findings
- [ ] `FindingAction` is exactly `fixNow` | `defer` | `skip` | `escalate`
- [ ] Ground truth carries `expectedAction`/`acceptedActions`/`rationale`/
      `evidenceRefs` per finding
- [ ] `ListingScenarioContext` implemented with all fields above
- [ ] Ground truth depends on severity + category + context, not severity
      alone
- [ ] All 5 regression tests pass
- [ ] Domain tests cover each of the 6 concrete skip cases plus the
      critical-violation exception
- [ ] Deterministic-replay test: same scenario + engine version → identical
      output
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
