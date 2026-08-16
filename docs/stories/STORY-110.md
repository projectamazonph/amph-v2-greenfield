# STORY-110: Landing page voice quick wins — beginner-friendly tone

**Sprint:** Landing page tone remediation

**Points:** 5

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress. Phase 1 of the `2026-08-16` landing voice audit.

## Goal

Apply the same gentle-and-patient-guide lens to the landing page copy that STORY-105 applied to the curriculum. Drop bootcamp phrasing, define jargon for a complete beginner, replace judgmental comparisons with concrete numbers, and remove the `$` from the Ticker CPC value to honour the Filipino-context rule in `docs/voice-guide.md` line 140.

## Source

`docs/audits/2026-08-16-landing-voice-beginner-friendly.md`.

## Scope

Ten copy edits across eight landing components, plus the headline substring list in `__tests__/page.test.tsx`. No structural changes, no new sections, no layout shifts.

- `src/components/landing/Hero.tsx`. Headline rewritten for beginners. Drop "Learn PPC" jargon. Drop "doing the work" bootcamp framing. Drop "before a client account is on the line" jargon. Drop the judgmental "not staying at ₱25k" hook. Drop "agency-side work" and "hiring pipeline" from the note line.
- `src/components/landing/Method.tsx`. Headline softened from "You don't just watch lessons" to "Reading isn't enough". Lede rewritten to remove the bootcamp "scored instantly / carry the instinct into paid work" cadence. Step 02 retitled from "Make the call" to "Try a decision". Step 04 reworded.
- `src/components/landing/WhoFor.tsx`. Headline trimmed. Lede drops "Skin in the game" venture-speak. The YES card drops the "not stay at ₱25k" comparison and is reframed as "move from ₱25k to ₱60k–₱80k / month".
- `src/components/landing/Curriculum.tsx`. Headline "No surprises" → "No hidden gates". Lede restructured.
- `src/components/landing/SimulatorSection.tsx`. Lede adds an inline gloss for ACoS ("Advertising Cost of Sales"). Tool description for Search Term Triage rewritten for a beginner.
- `src/components/landing/Mentor.tsx`. Lede tightened. Live-classes bullet drops "real calls" jargon.
- `src/components/landing/Proof.tsx`. Lede drops "hiring pipeline" jargon ("recognized by our hiring team").
- `src/components/landing/DarkCTA.tsx`. Headline rewritten to drop the banned "Stop watching. / Start deciding." pattern. Body drops "five scored simulators" (the in-course simulators are not all available) and the "hiring pipeline" reference.
- `src/components/landing/Footer.tsx`. Brand blurb trimmed.
- `src/components/landing/Ticker.tsx`. CPC value `$0.78` → `₱45.00` for Filipino context.
- `src/components/landing/StatsStrip.tsx`. Stat 4 retitled from "First-client lift / Junior → specialist gap" to "Specialist lift / What specialists charge over juniors".
- `src/components/landing/__tests__/page.test.tsx`. Headline substring list updated to match the new copy. Order check preserved.

## Acceptance checks

- ESLint passes including the `no-restricted-syntax` checks for `leverage`, `delve`, and `navigate the complexities`.
- `__tests__/page.test.tsx` passes with the new headline substrings.
- No banned phrase from the `__tests__/page.test.tsx` "sample check" appears in the rendered HTML.
- No `Stop watching.` or `Start deciding.` line remains in any landing component.
- No `$` symbol remains in `src/components/landing/Ticker.tsx`.
- No `PPC` acronym remains in `src/components/landing/Hero.tsx`.
- `pnpm tsc`, `pnpm lint`, `pnpm test` pass.

## Verification

- A grep for the bootcamp fingerprint phrases — "doing the work," "skin in the game," "stop watching," "start deciding," "on the line," "make the call," "by doing the work" — returns zero matches in `src/components/landing/`.
- A grep for `$` in `src/components/landing/Ticker.tsx` returns zero matches.
- A grep for `PPC` in `src/components/landing/Hero.tsx` returns zero matches.
- The read-aloud test from `docs/voice-guide.md` line 156 holds when the page is read to a Pinoy VA who has never opened Amazon Ads.
