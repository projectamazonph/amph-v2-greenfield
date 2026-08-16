# Landing page voice quick wins — beginner-friendly tone

**Audit:** 2026-08-16
**Author:** Ryan
**Status:** Phase 1 in flight (PR in WORK)

---

## Problem

The landing page reads as a confident pitch to Amazon ads specialists, not a starting point for a complete beginner. Three patterns show up in the copy:

1. **Bootcamp tone.** Phrases like "Learn PPC by doing the work," "Skin in the game changes how you show up," and the `Stop watching. / Start deciding.` headline are aggressive, sales-deck, and discoura­ging to a learner who has never opened Amazon Ads.
2. **Jargon without definition.** The hero says "PPC," "agency-side work," and "hiring pipeline" without a beginner's footing. The simulator section uses "ACoS" without a defining gloss. The Ticker carries `$0.78` for CPC, which is also a Filipino-context violation per `docs/voice-guide.md` line 140.
3. **Judgmental comparisons.** The hero hook says "Built for VAs aiming at ₱60k–₱80k / month, not staying at ₱25k." The "not staying at ₱25k" framing shames the reader. The WhoFor card says "You want to charge ₱60k–₱80k / month, not stay at ₱25k." Same pattern.

The curriculum voice pass (PR #370, STORY-105) already moved the lessons toward a gentle-and-patient-guide register. The landing page is the front door. The tone should match.

---

## Goals

1. **Cater to complete beginners.** A learner who has never opened Amazon Ads should be able to read the page top-to-bottom and understand what they would learn, what work is involved, and what they would get.
2. **Match the curriculum voice.** The same "no em-dashes, no AI-slop, no bootcamp, no undefined jargon" rules that the curriculum follows should land on the landing page.
3. **Keep the tests green.** `src/components/landing/__tests__/page.test.tsx` asserts the section headings in order. The new copy must still satisfy those substring checks, or the test must be updated alongside.

---

## Scope (in this pass)

The high-impact edits, scoped to copy only. No structural changes, no new sections, no layout shifts.

### Headlines (H1 / H2)

| Section | Old | New |
|---|---|---|
| Hero (H1) | "Learn PPC by / doing the work." | "Amazon ads, / taught for VAs new to the platform." |
| Method | "You don't just watch lessons." | "Reading isn't enough." |
| Curriculum | "Eight modules, in order. No surprises." | "Eight modules, in order. No hidden gates." |
| WhoFor | "A paid course. We think it should be." | "A paid course." |
| Pricing | "Three tiers, one-time payment." | unchanged |
| Mentor | "Direct, grounded in real account work." | unchanged |
| Proof | "A certificate that opens doors, not one that sits idle." | unchanged |
| FAQSection | "Plain answers." | unchanged |
| SimulatorSection | "Move a bid. Watch the account breathe." | unchanged |
| DarkCTA | "Stop watching. / Start deciding." | "Build the skill. / Show the work." |

### Body copy

- **Hero hook** drops "not staying at ₱25k" framing. New: "If you're at ₱25k/month now, the next step is ₱60k–₱80k. This is the path."
- **Hero body** drops "before a client account is on the line" (jargon). New: "Eight modules and five practice tools. You work with real campaign shapes before a client sees your work."
- **Hero note** drops "agency-side work" without definition. New phrasing: "skills for VAs who run ads for clients."
- **Method lede** drops "the same tools we use on real client accounts" copy. Reworded for the beginner's frame.
- **Method step 02** ("Make the call in a simulator") softened to "Try a decision in a simulator."
- **Curriculum *Tier* cell labels** make explicit which tier contains which module. The "Foundations / Mastery" labels stay.
- **WhoFor lede** drops "Skin in the game" venture-speak. New: "A paid course changes how you show up."
- **WhoFor YES item 3** drops "not stay at ₱25k" comparison. Reworded: "You want to move from ₱25k to ₱60k–₱80k per month."
- **SimulatorSection lede** adds an inline gloss for ACoS: "ACoS (Advertising Cost of Sales)".
- **Mentor lede** drops "agency-side" jargon. Reworded.
- **Proof lede** drops "hiring pipeline" jargon. Reworded: "recognized by our hiring team."
- **DarkCTA body** drops "five scored simulators" (the in-course simulators are not all available). New: "five practice tools."
- **StatsStrip stat 4** "Junior → specialist gap" sub reworded to "What specialists charge over juniors."
- **Ticker CPC** `$0.78` → `₱45.00` (Filipino context, voice-guide line 140).

### Test updates

`src/components/landing/__tests__/page.test.tsx` is updated to match the new headline substrings. The order-check is preserved.

---

## Out of scope (later stories)

- A new "What you'll learn" outcomes section (raised in `UI-AUDIT-FULL-2026-07-31.md` item 10). That's a structural change; it needs a design pass and a separate story.
- A "Start here if you have zero Amazon experience" anchor on the hero. Helpful but a separate scope.
- Replacing the Ticker entirely with a beginner-friendly metric strip. The ticker is decorative; the in-course vocabulary is taught in Module 1. Leaving the ticker as-is keeps the cognitive load low.
- Reviewing the BidElevator inline labels in `BidElevator.tsx` (Auto / Exact / Neg). The vocabulary is defined in the lesson that introduces it; expanding the inline gloss would clutter the preview.
- Translating any UI chrome into Tagalog. The voice guide (line 150) explicitly says no.

---

## Acceptance checks

- ESLint passes including `no-restricted-syntax` checks for `leverage`, `delve`, and `navigate the complexities`.
- `src/components/landing/__tests__/page.test.tsx` passes with the new substring list.
- No banned phrase from the `page.test.tsx` "sample check" list appears in the rendered HTML.
- No `> **Watch out:**`-style aggressive marketing line remains in the landing components.
- The `test:e2e` Playwright suite that lands on `/` still renders the page without runtime errors.
- `pnpm tsc`, `pnpm lint`, `pnpm test` pass.

---

## Verification

- Read the rendered HTML aloud as if speaking to a Pinoy VA who has never opened Amazon Ads. The read-aloud test from `docs/voice-guide.md` line 156 still holds.
- A grep for the bootcamp fingerprint phrases — "doing the work," "skin in the game," "stop watching," "start deciding," "on the line," "make the call," "by doing the work" — returns zero matches in `src/components/landing/`.
- A grep for `$` in `src/components/landing/Ticker.tsx` returns zero matches (the CPC value is now in ₱).
- `pnpm test src/components/landing/__tests__/page.test.tsx` passes.
- A grep for `PPC` in `src/components/landing/Hero.tsx` returns zero matches (the headline no longer uses the acronym).

---

## Companion story ticket

`docs/stories/STORY-110.md` — wired to this audit doc.
