# STORY-128: Add weekly client readouts to Module 5

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress.

## Context

This story closes LEARN-026 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. It follows the LEARN-025
pattern (STORY-127): one bridge section appended to every lesson in the
module, reusing each lesson's own PHP worked example so the rationale
matches the lesson it follows.

## Goal

Move a beginner from making isolated budget choices to producing the
written weekly client readout they can defend before touching a live
budget. Portfolio, budget, and seasonality decisions each lead to a
readout. The seasonal readout adds an escalation bridge.

## Scope

- Add a weekly-client-readout output to all three Module 5 lessons.
- 5.1 requires portfolio split, purpose, campaign-level controls, and a
  review trigger.
- 5.2 requires burn rate pattern, decision, and the peak window the
  change protects.
- 5.3 requires profit after ad spend for both months plus an explicit
  escalation line (stockout risk, margin change, spend past the agreed
  cap).
- Update the build plan, feature inventory, and changelog.

## Acceptance criteria

- Each Module 5 lesson adds its decision to a usable weekly client
  readout.
- Every readout includes a rationale that makes the recommend or hold
  decision clear.
- The final lesson produces enough detail for another PPC VA to defend
  the seasonal spend without guessing.
- Rationale examples are PHP-correct: 5.1 uses the 16-campaign account
  at ₱90,000 / ₱37,500 / ₱22,500, 5.2 uses the phone-case campaign at
  ₱1,500 daily hitting 80% by 11AM, and 5.3 uses the lunch-box Back to
  School push at ₱37,500 vs ₱60,938 profit after ad spend.
- Existing practice, feedback, worksheet, fact-card, and client-language
  blocks remain intact.

## Verification

- All three Module 5 lessons contain `## Weekly client readout`.
- The lesson-production report passes in strict mode.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks
  are required in CI.
