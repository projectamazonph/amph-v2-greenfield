# STORY-160 — Admin dashboard workbench polish

**Type:** UI/UX refinement (UI/UX-5 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/admin`
**Canvas:** https://superdesign.dev/teams/b799fd2d-4abb-489d-9f9a-33fc85e0d291/projects/d3cd32f1-bff7-4fb1-a0b4-f0ac84b0313c
**Selected variant:** Workbench Focus (`2936fd8b-bd7b-475d-ac0d-d2a0aaaed285`)

## Why

The /admin dashboard already had a sensible Stat-Led + Workbench macrostructure (6 stat tiles,
two workflow cards), but two gaps let it underdeliver for the operator:

1. **No workbench hero.** The TopBar greets the operator but doesn't tell them what to do
   first. The most consequential pending counter (`pendingRefunds`) was buried in a side card.
2. **Most-used write paths were two buttons.** Only `Create Course` and `Add User` were
   reachable from the dashboard; `Review refunds` and `Audit log` required remembering their
   direct URLs.

The Workbench Focus canvas variant (draft `2936fd8b-…`) puts the operator's identity and the
single highest-stakes counter at the very top, lifts every routine write path into a 4-card
workbench, and adds small mono captions to every stat tile.

## In scope (this PR)

1. **Hero workbench band** — full-width strip directly under the TopBar. Left: a small
   mono "You are signed in as" eyebrow, the operator's first name in Archivo, and a
   one-line status subtitle ("3 refund requests need a decision before the day ends.").
   Right: a `Review pending refunds` filled-amber CTA **only when `pendingRefunds > 0`**,
   alongside a quieter ghost `Open audit log →`. Both already use `requireAdmin()` on
   their destinations.
2. **Stat captions** — every tile gets a 10px uppercase mono caption under the value.
   "Total Courses" → "Across N modules" (where N is `PUBLIC_CURRICULUM_CLAIMS.modules.length`,
   the same reviewed contract the public surface reads). Pending refunds caption
   flips between "Awaiting decision" and "All clear" based on the count, so it never
   contradicts the table.
3. **Routine write paths (4-card grid)** — replaces the 2-button Quick Actions row.
   Each card is a white panel, 1px border, an accent-tinted icon tile, a title, and a
   one-line caption ("Add a new course to the catalog", "No requests waiting", etc.).
   The `Audit log` card uses the recent-activity count to say "5 recent entries on file".

## Out of scope (deferred)

- **Recent activity / Pending actions cards.** Already present and well-shaped.
- **Course-detail / lesson-detail admin views.** Each is its own surface with its own
  canvas pass.
- **Real-time pending-refund counts** (polling, SSE). Out of scope; the page renders on
  every request already so a stale number is acceptable.

## Acceptance criteria

- [ ] A `/admin` page reload renders the hero band, the 6-tile stat grid (with
      captions), and the 4-card workbench grid in that order.
- [ ] When `pendingRefunds > 0` the hero CTA "Review pending refunds" is rendered.
      When `pendingRefunds === 0` it is not.
- [ ] All 6 stat captions render. The "Total Courses" caption uses
      `PUBLIC_CURRICULUM_CLAIMS.modules.length` so the count never drifts from inventory.
- [ ] Each workbench card's caption reflects live data (refunds count, audit-log
      recent count) rather than a hardcoded string.
- [ ] Tokens only — no hex / raw spacing / raw radius values in `page.module.css`.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test src/app/tools` (closest mock-based
      harness) all green. There's no pre-existing page-level test for `/admin/page.tsx`;
      the existing pattern leaves page-level coverage to E2E + the architecture checks.

## Files

- Modify: `src/app/admin/page.tsx` — add `heroBand`, captions, workbench grid; drop
  the unused `Plus` icon import.
- Modify: `src/app/admin/page.module.css` — add `.statCaption`, `.heroBand*`,
  `.heroCtaPrimary`, `.heroCtaGhost`, `.workbench*` styles. Existing `.quickActions`
  kept in CSS for backwards-compat but is no longer rendered by the page.
- New: this file.

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(admin): …`.
- Branch ready for the user to push & open PR against `main`.
