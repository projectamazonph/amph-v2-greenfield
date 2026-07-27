# Simulator accuracy review, 2026-07-26

## Why this doc exists

A pasted external review of the simulator subsystem was received as a task,
covering scoring inflation, dimension naming, and Amazon PPC subject-matter
accuracy. As with the earlier `docs/audit-2026-07-26-hardening-review.md`
pass, every claim was checked against the actual source before anything was
acted on.

**Unlike the previous audit, this one holds up.** Every substantive claim
that was checked is accurate. Three further problems were found that the
review did not mention, and two of them are more serious than anything it
reported.

**Scope note:** this was a documentation-only pass. No application or
scoring code was changed. The sequenced remediation plan is at the bottom
of this doc.

---

## Verified claims (all confirmed)

### Every simulator hands out a free `explanation: 100`

Confirmed in all four simulators. Each returns a hardcoded literal, with a
comment acknowledging it as a placeholder:

| Simulator        | Location                                                      |
| ---------------- | ------------------------------------------------------------- |
| Bid Elevator     | `BidElevatorSimulator.ts:144`, `const explanation = 100;`     |
| Campaign Builder | `CampaignBuilderSimulator.ts:302`, `const explanation = 100;` |
| STR Triage       | `StrTriageSimulator.ts:76`, `explanation: 100,`               |
| Listing Audit    | `ListingAuditSimulator.ts:212`, `explanation: 100,`           |

### Score policies still weight that free dimension 10 to 25 percent

Confirmed exactly as reported, in `scripts/seed-simulator-policies.ts`:

| Policy                                | explanation weight |
| ------------------------------------- | ------------------ |
| `bid-elevator/beginner/credential`    | 0.10               |
| `bid-elevator/advanced/practice`      | 0.10               |
| `str-triage/beginner/credential`      | 0.10               |
| `str-triage/advanced/practice`        | 0.10               |
| `campaign-builder/advanced/practice`  | 0.10               |
| `listing-audit/beginner/practice`     | **0.20**           |
| `listing-audit/intermediate/practice` | 0.15               |
| `listing-audit/advanced/practice`     | **0.25**           |

The partial mitigation the review noted is real: several beginner and
intermediate _practice_ policies do omit `explanation`. But see
"Undocumented finding 2" below, because that mitigation introduced a bug.

### Listing Audit dimensions are mislabeled

All three confirmed in `ListingAuditSimulator.ts`:

- **`dataSufficiency` is completion, not evidence sufficiency.**
  `scoreDataSufficiency` (line 201) is
  `findings with a userChoice / total findings`. It measures whether the
  learner clicked, nothing else. Suggested rename: `reviewCoverage`.
- **`profitability` is not profitability, in Listing Audit.**
  `scoreProfitability` (line 186) is severity-weighted coverage of must-fix
  findings. There is no conversion, revenue, ACOS, PPC-efficiency,
  compliance-risk, or search-relevance modelling anywhere in it. Suggested
  rename: `priorityCoverage`. **This rename must not be applied globally,
  see the note below.**

- **Ground truth is crudely binary.** `groundTruthAction` (line 158) is
  the entire rule:
  ```ts
  return severity === "info" ? "skip" : "fix";
  ```
  Severity is a proxy for correct action, and it does not account for
  category, marketplace, product strategy, mobile readability, compliance,
  existing imagery, brand voice, or keyword intent.

### Scope correction: the rename is not uniform across simulators

The external review implied `dataSufficiency` and `profitability` are
mislabeled wherever they appear. Checking STR Triage, which shares both
dimension names, shows that is only half true:

| Dimension         | Listing Audit                                  | STR Triage                                                      |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `dataSufficiency` | completion (`userChoice` set / total findings) | completion (`reviewed / rows.length`), same mislabel            |
| `profitability`   | severity-weighted fix coverage, **mislabeled** | `preservedRevenue / nonPausableRevenue`, **legitimately named** |

`StrTriageSimulator.scoreProfitability` (lines 98-132) builds a
`revenueByKeyword` map, sums `nonPausableRevenue`, and returns the fraction
of that revenue the learner preserved by not wrongly pausing. That is a
genuine revenue-impact measure and its name is accurate.

So the rename splits:

- `dataSufficiency` to `reviewCoverage`: **both** simulators, both are
  completion metrics.
- `profitability` to `priorityCoverage`: **Listing Audit only**. Renaming
  STR Triage's would take a correctly-named dimension and mislabel it.

The same asymmetry applies to ungrading completion (STORY-072): STR Triage
weights its `dataSufficiency` at 0.1 to 0.2, so it has the same free-points
problem as Listing Audit, just a smaller one.

### Keyword research emits generic terms with invented volumes

Confirmed at `ListingAuditSimulator.ts:132-140`. The suggestions are
hardcoded string templates with hardcoded search-volume integers:

```ts
[`${lower} buy online`, 2000, "medium"],
[`${lower} cheap`,      1500, "medium"],
[`wholesale ${lower}`,   300, "low"],
[`${lower} near me`,    2000, "medium"],
[`${lower} free shipping`, 1200, "medium"],
```

`near me` in particular is a local-search intent that does not transfer to
Amazon retail search. The volumes are not sourced from any dataset.

### The backend search-terms rule is backwards

Confirmed at `ListingAuditSimulator.ts:258-270`:

```ts
// Backend keywords: if bullets + title < 500 chars combined, suggest backend
const totalChars = title.length + bullets.reduce((s, b) => s + b.length, 0);
... totalChars < 500 ? [{ ...
      message: "Not enough room in visible content for all keywords.",
```

The condition fires when visible content is **short**, and then claims
there is not enough room. It is inverted: short visible copy means there is
room remaining. It is long, exhausted copy that forces keywords into the
backend field.

---

## Undocumented finding 1, clicking "fix" on everything passes every Listing Audit difficulty

This is the concrete, exploitable consequence of the inflation the review
described in the abstract. Replaying the real scoring functions against a
representative six-finding set (2 critical, 2 warning, 2 info):

```text
listing-audit beginner       all-"fix" strategy => 87  PASS (needs 70)
listing-audit intermediate   all-"fix" strategy => 88  PASS (needs 72)
listing-audit advanced       all-"fix" strategy => 90  PASS (needs 75)
```

Random fix/skip guessing (20,000 trials) passes beginner **89.1%** of the
time, intermediate 62.3%, advanced 56.5%.

There are three independent reasons a thoughtless learner scores well, and
they compound:

1. `explanation` is a free 100.
2. `dataSufficiency` rewards clicking, not judgement, so it is also
   effectively free for anyone who finishes the attempt.
3. `profitability` is **recall-only**. It asks "did you fix the things that
   needed fixing" and never asks "did you also fix things that did not."
   Marking every finding `fix` therefore scores a guaranteed 100 on it by
   construction.

On beginner, reasons 1 and 2 alone are 60% of the grade before the learner
evaluates anything.

## Undocumented finding 2, four policies cap a flawless learner at 90

The partial fix for explanation inflation removed the `explanation` line
from several practice policies **without redistributing its weight**. Those
policies now sum to 0.90:

```text
bid-elevator/beginner/practice         Sw=0.90  perfect score = 90
bid-elevator/intermediate/practice     Sw=0.90  perfect score = 90
campaign-builder/beginner/practice     Sw=0.90  perfect score = 90
campaign-builder/intermediate/practice Sw=0.90  perfect score = 90
```

`getOverallScore()` (`ScorePolicy.ts:125`) does not normalise by weight
sum, it is a plain `sum(weight * score)`, so 100 on every configured
dimension yields 90.

This should have been impossible. `createScorePolicy()` (line 80)
explicitly rejects it:

```ts
if (Math.abs(totalWeight - 1.0) > 0.001) {
  return Result.err({ kind: "invalid_weight_sum", total: totalWeight });
}
```

It ships anyway because **nothing in the write or read path calls that
validation**:

1. `scripts/seed-simulator-policies.ts` writes via raw
   `prisma.scorePolicy.upsert(...)`, bypassing the factory entirely.
2. `PrismaScorePolicyRepository.ts:29` reads via `hydrateScorePolicy()`,
   which is documented as _"Skips factory validation, use for trusted
   persisted data only."_
3. `isValidPolicy()` (line 153) exists to catch exactly this at hydration
   time and has **zero non-test callers**. It is dead code.

So the domain layer models the invariant correctly and no layer enforces it.

## Undocumented finding 3, `passingThreshold` is dead config

Every dimension of every seeded policy carries a `passingThreshold`, and
`DimensionConfig` documents it as:

> `passingThreshold`: raw score (0-100) the student must hit on this
> dimension to earn full credit. Below this, the dimension contributes
> proportionally less (partial credit).

`getOverallScore()` never reads it. A repo-wide search for
`passingThreshold` outside tests and the type definition returns nothing.
Grading is plain linear weighting. Per-dimension thresholds and the
partial-credit behaviour they describe do not exist. The config is seeded
into the database and silently ignored.

---

## How far the mechanical fixes actually get us

Measured twice, because the first two attempts were both too optimistic.
The first draft asserted Phase 0 would close the bypass. The second modelled
it against a synthetic six-finding set and claimed beginner would be
blocked. Running the **real simulator** against the **real post-Sprint-14
policies** shows neither was right.

Scoring the actual `ListingAuditSimulator` output for a weak listing
(`title: "x"`, no bullets, no description, niche "running shoes"):

```text
                 before Sprint 14   after Sprint 14   threshold
beginner              90                 75              70      still passes
intermediate          90                 80              72      still passes
advanced              93                 82              75      still passes
```

The margin over the pass mark collapses (beginner +20 to +5, advanced +18 to
+7) and every _guaranteed_ free 100 is gone, but **"fix everything" still
passes at every difficulty.**

The reason is structural and only visible against real output. The finding
generator emits very few findings, and they skew heavily to `fix`:

```text
weak listing    4 findings   3 fix / 1 skip   all-"fix" direction = 75
decent listing  1 finding    1 fix / 0 skip   all-"fix" direction = 100
strong listing  1 finding    0 fix / 1 skip   all-"fix" direction = 0
```

With three or four findings, three of which genuinely are `fix`, marking
everything `fix` earns 75% on `direction` honestly. No re-weighting of
`direction` can prevent that, because `direction` is the dimension that
measures judgement and the answer key really does say `fix`. A one-finding
audit is also not much of an audit, which is its own quality problem.

So Phase 0 should be understood as **removing the guaranteed free marks and
shrinking the margin, not closing the bypass**:

- `explanation` (guaranteed 100) is gone.
- `reviewCoverage` (guaranteed 100 for anyone who finishes) is no longer
  graded.
- `priorityCoverage` no longer returns a guaranteed 100 for fixing
  everything (93 instead of 100 on the weak listing, and 0 on the strong
  one).

Closing it needs two things from Phase 2, not Phase 0: non-binary,
category-aware ground truth so `fix` is not almost always correct
(STORY-083), and a finding generator that produces a richer, more balanced
set (STORY-080). Until both land, STORY-078 is what keeps these results away
from anything read as a credential.

## What was _not_ re-verified

The review's assessments of Bid Elevator economics, STR Triage classifier
depth, and Campaign Builder strategic scoring were not independently
re-derived in this pass. They restate findings from an earlier review and
no commit since has touched that logic. They are carried forward as
plausible-and-unchallenged rather than freshly confirmed. Its maturity
scores (8/10 engineering, 4.5/10 PPC accuracy, 3/10 certification
readiness) are editorial judgements, not checkable claims, and are recorded
here without endorsement.

---

## Remediation plan

Sequenced so that scoring **integrity** lands before scoring **content**.
There is no value in tuning ground truth while a learner can coast on free
dimensions, and no value in re-weighting dimensions that are about to be
renamed or removed.

### Phase 0, scoring integrity (mechanical, verifiable, no PPC judgement)

Nothing here requires deciding what a correct Amazon answer is. All of it
is provable against existing invariants or against the measured behaviour
above.

| ID        | Title                                                                                                                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-071 | Remove `explanation` from every active score policy; redistribute weight so all policies sum to 1.0                                                                                                                                                 |
| STORY-072 | Stop grading completion: `reviewCoverage` becomes a submission gate, not a weighted dimension                                                                                                                                                       |
| STORY-073 | Make `priorityCoverage` penalise false positives (recall to F1) so "fix everything" cannot score 100                                                                                                                                                |
| STORY-074 | Route policy seeding through `createScorePolicy()`; call `isValidPolicy()` at hydration so an invalid policy can never ship again                                                                                                                   |
| STORY-075 | Resolve `passingThreshold`: either implement the documented partial-credit behaviour in `getOverallScore()` or delete the field and its seed data                                                                                                   |
| STORY-076 | Rename `dataSufficiency` to `reviewCoverage` (both simulators) and Listing Audit's `profitability` to `priorityCoverage` (**not** STR Triage's, which is correctly named), across simulators, policies, and persisted attempts (migration required) |
| STORY-077 | Fix the inverted backend search-terms rule in `ListingAuditSimulator`                                                                                                                                                                               |

After Phase 0: a perfect run scores 100, no dimension name claims to
measure something it does not, no policy can ship with invalid weights, and
every guaranteed free 100 is gone. The click-through bypass is **narrowed,
not closed**: measured against the real simulator it still passes at every
difficulty, just with a much smaller margin. See the measurement section
above, and STORY-080 plus STORY-083 for what actually closes it.

### Phase 1, certification safety (product decision, small code)

| ID        | Title                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-078 | Mark all current simulator results **formative**; block them from contributing to certification, job-readiness, or hiring signals until ground truth is trustworthy |

This is deliberately separated and should not wait for Phase 2. It is cheap
to build and is the only item that limits external harm while the
subject-matter work is outstanding.

### Phase 2, subject-matter accuracy (requires Amazon PPC expertise)

**These need your domain input. Do not let an agent invent the ground truth
here.** Inventing plausible-looking correct answers is the exact failure
this whole review is about.

| ID        | Title                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-079 | Rewrite Bid Elevator's economic model: real target-ROAS derivation, remove volume-share-driven "correct" bids, remove fixed-CTR assumptions, add business context          |
| STORY-080 | Replace length-based listing scoring with a real rubric (relevance, intent, compliance, mobile readability, imagery)                                                       |
| STORY-081 | Replace hardcoded keyword volumes with versioned scenario datasets; separate Listing Audit from Keyword Research                                                           |
| STORY-082 | Expand STR Triage: click thresholds, relevance, existing-target detection, negative-match precision, branded/non-branded routing, data-delay awareness                     |
| STORY-083 | Non-binary Listing Audit ground truth: per-category, per-marketplace, strategy-aware correct actions. **This is the story that actually closes the click-through bypass.** |
| STORY-084 | Campaign Builder strategic scoring: negative architecture, target duplication, branded isolation, match-type separation, naming compliance, budget reconciliation          |

### Phase 3, assessment platform maturity

| ID        | Title                                               |
| --------- | --------------------------------------------------- |
| STORY-085 | Scenario publishing + versioning                    |
| STORY-086 | Instructor calibration and acceptable-answer ranges |
| STORY-087 | Explicit business-impact feedback                   |
| STORY-088 | Challenge progression                               |
| STORY-089 | Connected-account simulator                         |

---

## Bottom line

The review's central conclusion is correct and is now supported by
reproducible evidence: **the platform grades consistently, but several of
the answers it treats as correct are not reliable, and on Listing Audit the
grade can currently be obtained without engaging with the content at all.**

The scoring-integrity defects (Phase 0) are worse than the review claimed
and are also the cheapest to fix, so they should not wait on the
subject-matter sprint. But measuring them against the real simulator rather
than a model made something clear that neither the review nor the first two
drafts of this doc got right: **Phase 0 does not make a Listing Audit result
trustworthy, and does not stop a learner passing by clicking.** It removes
the free marks and shrinks the margin. Closing the bypass needs STORY-080
and STORY-083, and until those land STORY-078 should keep these results away
from anything a student or employer would read as a credential.
