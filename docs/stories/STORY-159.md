# STORY-159 — Tools index status-first cards

**Type:** UI/UX refinement (UI/UX-4 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/simulators`
**Canvas:** https://superdesign.dev/teams/b799fd2d-4abb-489d-9f9a-33fc85e0d291/projects/d3cd32f1-bff7-4fb1-a0b4-f0ac84b0313c
**Selected variant:** Status-First (`e1ae861c-7f9c-4f0b-acba-5579928e9775`)

## Why

The `/tools` index lists five registered simulators plus one live ad console but does
not surface the availability distinction the rest of the public surface already documents:
"Public preview" vs "Enrolled practice". The variant canvas draft `e1ae861c-…` re-arranged
the existing flat grid into a status-first layout where every card carries both a small
mono skill tag and an availability pill, so a learner can tell at a glance which tools
they can try without paying and which require an enrollment.

Source of truth for availability is `PUBLIC_CURRICULUM_CLAIMS.simulators[id].availability`,
the same reviewed claims contract the rest of the public surface reads from. **The
canvas variant got `listing-audit` wrong** (it marked it as public-preview); the
implementation follows the claims contract: listing-audit is enrolled-practice.

## In scope (this PR)

1. **`/tools/page.tsx`** — add a `cardMetaRow` per simulator card with a `skillTag`
   (10px mono caption, `--ink-500`) and a `statusPill` whose variant class derives from
   `PUBLIC_CURRICULUM_CLAIMS.simulators[id].availability`.
2. **`/tools/page.module.css`** — add `.cardMetaRow`, `.skillTag`, `.skillTagLive`,
   `.statusPill`, `.statusPillPublic`, `.statusPillEnrolled`, `.statusPillLive`,
   `.cardNameLive`. Tokens only; no hex values; no raw spacing.
3. **Live Console card** — switch the existing orange-tinted live card to a meta row
   with a `Production environment` skill tag and a red `Live account` pill, matching
   the rest of the meta-row grammar.
4. **Domain tests** in `src/app/tools/__tests__/page.test.tsx` — pin the claims
   contract for `bid-elevator` (public-preview) and `listing-audit`
   (enrolled-practice), and pin the simulator-registry id list.

## Out of scope (deferred)

- **Individual simulator practice pages (`/tools/bid-elevator`, `/tools/campaign-builder`,
  etc.).** Each is its own surface with its own canvas pass. Defer.
- **Skill tag taxonomy (Pricing & bids / Search intent / etc.).** Currently
  page-local in `SIMULATOR_SKILL_TAG`. Promoting it to the reviewed claims contract is
  a deliberate decision that should be made once the wording is stable; defer.
- **Sort cards by curriculum order on the page.** The variant draft did not request
  re-ordering and the page is consistently sorted by registry order today. Defer.
- **`Continue last practice` strip at top.** Would require a new query for the user's
  most recent attempt; out of scope here.

## Acceptance criteria

- [ ] Each simulator card on `/tools` shows a skill tag (left) and a status pill (right)
      above the card name.
- [ ] The status pill text matches `STATUS_LABEL[availability]` from
      `PUBLIC_CURRICULUM_CLAIMS`: `Public preview` for `public-preview`,
      `Enrolled practice` for `enrolled-practice`.
- [ ] `bid-elevator` shows `Public preview`, the other four simulators show
      `Enrolled practice`.
- [ ] The live console card uses the red `Live account` pill and a
      `Production environment` skill tag.
- [ ] No hex / raw spacing / raw radius values appear in the new CSS module rules.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run src/app/tools` all green.

## Files

- Modify: `src/app/tools/page.tsx` — new `TOOL_INFO` shape with `skillTag`,
  `availabilityFor()` lookup, `<div class="cardMetaRow">…</div>` per card.
- Modify: `src/app/tools/page.module.css` — meta-row + status-pill styles.
- Modify: `src/app/tools/__tests__/page.test.tsx` — three new domain tests.
- New: this file.

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(tools): …`.
- Branch ready for the user to push & open PR against `main`.
