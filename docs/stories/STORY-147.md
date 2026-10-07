# STORY-147 — Curriculum source provenance: link health check + missing fact cards

**Sprint:** Learning experience uplift, follow-up to Module -1 (PR #549)
**Points:** 3
**Epic:** Content quality
**Owner:** Ryan
**Status:** In review

## Goal

Every product claim a lesson makes can be traced to a source, and the mechanical
half of that promise (the source still exists) runs as one command instead of
living only in a manual review note.

## Context

Two things surfaced while reviewing what LEARN-020 actually enforces:

1. `scripts/validate-lesson-production.ts` requires seven blocks per lesson
   (outcome, decision, worked example, active attempt, feedback, evidence,
   retrieval). A fact card is **not** one of them, so the earlier note that
   "fact cards enforce source verification" was wrong. 20 of 45 lessons carry
   no fact card at all and the contract still reports 45/45 complete.
2. Of the 25 lessons that do carry a fact card, 19 have
   `Last verified: pending content-owner review`, and **zero** have a real date.
   Nothing checked whether the cited `Official source URL` still resolves.

Stamping dates by hand was not an option: an agent has not verified Amazon's
policy text, only whether a link answers. So this story adds the mechanical
check and leaves the editorial dates to the content owner.

## Scope

- New `scripts/check-curriculum-sources.mjs`, exposed as
  `pnpm check:curriculum-sources`. It walks every lesson, pulls the URL(s) off
  the `Official source URL:` line, dedupes, and probes each one (HEAD, then GET
  when HEAD is refused, 20s timeout, concurrency 4). Report is grouped by URL
  with the citing lessons listed, then two coverage sections: fact cards whose
  source line holds no URL, and lessons with no fact card at all.
- Report-only by default. `--fail-on-error` exists for a scheduled job. Not
  wired into `validate:learning-release` or CI: Amazon's public pages sit behind
  bot treatment and login redirects, so a blocking gate on them would be flaky.
- Fact cards added to the four lessons that make product-surface claims and had
  none: the onboarding pair `0.1-welcome` and `0.2-platform-tour`, plus
  `3.3-aplus-content` and `8.3-competitor-benchmarking`. Wording mirrors each
  lesson's own claims; no new Amazon policy facts introduced.
- `content/curriculum/diagnostic.json`: the "New to Amazon PPC" outcome now
  recommends Module -1 before Module 0. PR #549 added the primer but left the
  diagnostic pointing every beginner at Module 0, which is the gap this closes.
  Copy-only change; `scoreDiagnostic()` matches on the `score` maps, which are
  untouched.

## Non-goals

- No invented `Last verified` dates. A date would claim a review that has not
  happened.
- No fact cards for the remaining 16 lessons with no fact card. Most are process
  and communication lessons (Modules 9-11) where a card would be decoration.
  Three of them (0.3, 4.4, 5.3) name a product surface once or twice and can
  take a card at their next rewrite.
- No link checking inside `validate:lesson-production`. Same script, stricter
  exit codes, but that validator runs in CI and must stay offline-clean.

## Acceptance criteria

- [x] `pnpm check:curriculum-sources` runs offline-resilient, exits 0 with no
      `--fail-on-error`, and lists every distinct cited URL plus its citing lessons.
- [x] The three fact cards that deliberately say "No single official source"
      (1.5, 3.1, 3.2) are reported as a named section rather than as failures.
- [x] Lessons with no fact card are listed, so the 20-lesson gap is visible
      instead of hidden behind a green 45/45.
- [x] The four new fact cards carry all eight LEARN-020 markers and pass
      `pnpm validate:lesson-production`.
- [x] Diagnostic "new" outcome names Module -1; the other two outcomes still
      resolve to the same ids.

## Verification

Run on 2026-09-22 against `main` at `21f3b24`:

```
Curriculum source-link health
Lessons scanned: 45
Distinct cited URLs: 10 (reachable 10, not reachable 0)
```

All ten URLs return 200, including the five `advertising.amazon.com/help/<id>`
deep links and both Module -1 entry points. The check found no dead sources.

Candidate Amazon deep links probed for the new fact cards and rejected as
citations because they 404 from a plain request: `sell.amazon.com/brand-registry`,
`sellercentral.amazon.com/brand/registry`,
`advertising.amazon.com/products/sponsored-brands`,
`advertising.amazon.com/library/guides/a-plus-content`,
`sellercentral.amazon.com/aplus`. The new cards therefore cite entry points only
and say so in the field itself.

## Follow-ups

- Shipped in STORY-148: the checker now also tallies the `Last verified` field by
  style, so the 29 cards awaiting a real date are listed rather than hidden, and
  the `## Amazon Ads Fact Card` heading variant is detected as a card.
- Content owner pass to replace `pending content-owner review` with real dates on
  the 19 placeholder cards, starting with `3.3-aplus-content` (trademark cost
  range, Brand Registry fee status, and the 5-17% / 8-20% lift figures are the
  claims most likely to go stale).
- Decide whether a deep link per claim is worth a login-gated reference id.
- Consider a scheduled `--fail-on-error` run outside the release gate.
