# STORY-157 — Dashboard focus-mode polish

**Type:** UI/UX refinement (UI/UX-2 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/refinement` (worktree at `D:/Projects/.minimax/worktrees/uiux-refinement`)
**Canvas:** https://superdesign.dev/teams/b799fd2d-4abb-489d-9f9a-33fc85e0d291/projects/d3cd32f1-bff7-4fb1-a0b4-f0ac84b0313c
**Selected variant:** Focus Mode (`9375d94d-64cd-40ed-be8c-1950da83f781`)

## Why

The student dashboard is the second-most-visited surface after the lesson reader. The current
layout (reproduced faithfully on the canvas as variant `640fc213-…`) stacks the Welcome header,
Continue card, in-progress grid, My courses list, and Quick Actions in a vertical scroll — but
gives no visible signal of how engaged the learner is, and the Continue card sits as a small
panel rather than the day's primary action.

The focus-mode variant reframes the page around a single dominant Continue card, surfaces a
5-day streak + XP strip in the hero header, and gives the dashboard a denser, action-led
rhythm. This PR implements the on-brand subset without introducing new domain concepts.

## In scope (this PR)

1. **Hero stats strip** — small horizontal pill on the right of the hero header showing a
   5-day activity row (3 filled + 2 unfilled dots in --c-orange / --c-border) and the user's
   total XP (sum of `XPEvent.amount` for the user) prefixed by the lightning icon.
2. **Dominant Continue card** — the existing Continue learning card is restyled into a navy
   gradient panel with the course cover image as a faded background, an "In progress" orange
   pill + mono progress percentage, a 32px Archivo H2 course title, a "Next up: <lesson>" line,
   a primary orange "Continue learning" CTA with a play icon, a ghost "View syllabus" link,
   and a 1.5px orange progress bar pinned to the very bottom of the card.

## Out of scope (deferred)

- **Recent activity timeline.** The variant shows a vertical timeline of the last 5
  progress events / badge awards / certificate issuances / simulator attempts. This requires
  a new domain use case (`GetRecentActivity`) that aggregates `ProgressEvent`, `BadgeAward`,
  `Certificate`, and `SimulatorAttempt` per user. Substantial scope. Defer to a follow-up.
- **Move Quick Actions into the sidebar.** The variant relocates them. Sidebar rework is
  intrusive and the existing placement is conventional; defer.
- **Compact course list (My courses).** The variant's compact thumbnails + progress bars
  density pass is a separate refactor with its own design decisions. Defer.
- **5-day streak service changes.** The XP/streak dots come from existing
  `XPEvent.amount` sums + `UserStreak.lastVisitDate`. No service changes needed for this PR.

## Acceptance criteria

- [ ] `DashboardHeroStats` component renders 5 dots (3 filled by default when the user has
      XP events in the last 5 days, falling back to all-unfilled when not) and the total XP
      number sourced from `IXPEventRepository.findByUserId`.
- [ ] `ContinueCardHero` (or equivalent rename) is the dominant element in the visible
      viewport on desktop (≥ 360px height), with the bottom-aligned progress bar matching the
      existing milestone system in the in-progress grid.
- [ ] All new copy uses verified claims only. No invented XP totals or progress percentages.
- [ ] Tokens-only CSS; no hardcoded colors, spacing, radii.
- [ ] Accessibility: aria-label on the dots strip announcing "X day streak out of 5",
      progressbar role on the bottom strip with live aria-valuenow.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run src/app/dashboard
    src/components/student` all green.
- [ ] New regression test pins the hero-stats render and the dominant-card class.

## Files

- New: `src/components/student/DashboardHeroStats.tsx`
- New: `src/components/student/DashboardHeroStats.module.css`
- New: `src/components/student/__tests__/DashboardHeroStats.test.tsx`
- Modify: `src/app/dashboard/page.tsx` (hero stats helper, dominant card markup)
- Modify: `src/app/dashboard/page.module.css` (dominant card styles + bottom progress strip)

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(dashboard): …`.
- Branch ready for the user to push & open PR against `main`.

## Risks

- Total XP is shown without rank context. If the platform later adds tiers based on XP, this
  number may need to render as "Tier 2 — 1,240 XP" or similar. Out of scope for this PR.
- The "In progress" pill on the Continue card is hardcoded; if a course is completed it
  should swap to "Completed". Defer until the activity timeline work adds the right state
  plumbing.
