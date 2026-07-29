# STORY-080: Replace length-based listing scoring with a real rubric

## Status

**Blocked — needs Ryan's PPC/listing-optimization input.** Per
`docs/sprint-plan.md` Sprint 15 and
`docs/audit-2026-07-26-simulator-accuracy-review.md` Phase 2. This is also
the story that supplies half of what's needed to close the Listing Audit
click-through bypass (the other half is STORY-083's ground-truth rule) —
a richer, more varied finding set is what stops "mark everything fix"
from being cheaply correct.

## Current mechanism (verbatim, `ListingAuditSimulator.ts`)

```ts
// Title: 1pt per 3 chars, capped at 100, minus 20 if <50 chars, minus 10 if a niche word is missing
let score = Math.min(100, Math.round(title.length / 3));

// Bullets: 1pt per 5 chars of combined bullet text, minus 15 if fewer than 5 bullets
let score = Math.min(100, Math.round(totalChars / 5));

// Description: 1pt per 2 chars, capped at 100
const descriptionScore = Math.min(100, Math.round(description.length / 2));
```

Every score is a function of character count, plus one niche-keyword
substring check on the title. There is no relevance, search-intent, Amazon
policy/TOS compliance, mobile-readability, or imagery modeling anywhere —
imagery in particular cannot be modeled today because `ListingAuditInput`
has no image field at all.

The finding generator (same file) currently produces at most 4 findings
per listing (title, bullets, description, backend — one each, gated by
simple thresholds), which is part of why "fix everything" is cheap: there
just isn't much to get wrong. See the audit doc's "Undocumented finding 1"
section for the measured pass-rates this produces.

## Open questions for Ryan

1. **What are the real audit dimensions?** Candidates pulled from common
   Amazon listing-optimization practice, for you to confirm/replace/reject
   — not to be taken as the answer:
   - Search-intent / keyword relevance and placement (front-loaded vs
     buried)
   - Compliance red flags (prohibited claims, competitor/ASIN mentions,
     subjective superlatives Amazon flags, ALL-CAPS abuse, restricted
     category language)
   - Mobile readability (title truncation point on mobile search results,
     bullet line-length)
   - Category-specific rules (e.g. supplement compliance claims vs.
     apparel sizing/fit content)
     **Answer:**

2. **Does length still matter at all, and if so how?** Amazon does have
   real limits (title ~200 chars, 5 bullets). Should length be a pass/fail
   gate near those real limits rather than a linear score driver?
   **Answer:**

3. **Should the rubric vary by `category`/`niche`** (both already inputs)?
   If so, what's the smallest set of category-specific rule variants worth
   building first?
   **Answer:**

4. **Imagery is explicitly out of scope today** — `ListingAuditInput` has
   no image data. Do you want this story to add an imagery checklist input
   (e.g. image count, whether a lifestyle/infographic image is present) as
   new fields, or defer imagery entirely to a later story?
   **Answer:**

5. **What shape do you want the rubric in?** A weighted checklist of
   binary pass/fail rules (easier to make deterministic and testable), or
   continuous per-rule scores? Either is buildable; pick one so the finding
   generator and the scoring function agree on it.
   **Answer:**

6. **How many findings should a realistic listing produce?** The current
   generator tops out at ~4. What's a realistic count and severity mix
   (e.g. 8-15 findings, weighted toward warning/info) for a mediocre
   listing, so the bypass STORY-083 needs to close actually has enough
   surface area?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the rubric shape and rule set are specified, implementation is
ordinary domain work: replace `auditTitle`/`auditBullets`/description
scoring with functions that implement the specified checks, extend
`AuditCategory` and the finding generator to emit the richer, more varied
set from Q6, and (if Q4 says yes) extend `ListingAuditInput` with imagery
fields. Tests assert each rule against listings Ryan characterizes as
good/mediocre/bad — not against invented pass thresholds.

## Non-goals

- Full NLP-based semantic relevance scoring. Rule-based checks are the
  target unless Ryan asks for something more sophisticated.
- Live Amazon API integration for actual search-rank verification.

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q6 answered by Ryan (no TBDs remain)
- [ ] Title/bullet/description scoring replaced by the specified rubric,
      not character-count proxies
- [ ] Finding generator produces the richer, more varied set from Q6
- [ ] Imagery handled per Q4 (either new input fields + checks, or
      explicitly deferred with a follow-up story filed)
- [ ] Domain tests cover each rubric rule against Ryan-characterized
      example listings
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
