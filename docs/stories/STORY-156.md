# STORY-156 — Landing page conversion polish

**Type:** UI/UX refinement (UI/UX-1 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/landing-conversion-polish`
**Canvas:** https://superdesign.dev/teams/b799fd2d-4abb-489d-9f9a-33fc85e0d291/projects/d3cd32f1-bff7-4fb1-a0b4-f0ac84b0313c
**Selected variant:** Conversion Focused (`1d731cda-2d38-4f53-9324-5986b12dbbf6`)

## Why

The landing page is the highest-traffic, highest-leverage surface in AMPH. The current
implementation (reproduced faithfully on the canvas as variant `817965a2-…`) shows the value
proposition, but the price ladder is buried below seven sections, the primary CTA points to the
in-page `#pricing` anchor rather than carrying the visitor to conversion, and the floating stat
chip on the hero image is small and easy to miss.

The conversion-focused variant reframes the hero around the price and the action: surface the
three tiers above the fold, lead with a clear conversion chip, and put a more prominent
"LIVE PREVIEW" badge on the simulator image so the platform's product identity is unmistakable.

## In scope (this PR)

1. **Hero conversion chip** — small orange-tinted pill above the eyebrow line that links to the
   pricing anchor. Sets the conversion intent immediately.
2. **Hero price ladder** — 3-up compact tier strip (₱2,999 / ₱5,999 / ₱9,999) inserted between
   the body paragraph and the CTA row. Middle tier marked "Most picked" with the existing
   orange-border + ribbon pattern. Anchored so it scrolls with the hero copy.
3. **Hero CTA copy refresh** — primary CTA becomes "Get Instant Access →"; ghost CTA becomes
   "Try Demo Simulator". Both still anchor to the existing `#pricing` and `#simulator` sections.
4. **Hero "LIVE PREVIEW" badge** — replaces the single-metric ACoS stat chip with a two-metric
   navy badge ("DAILY SALES" + "ACoS") that mirrors the actual simulator visual language.

## Out of scope (deferred)

- **Sticky tier-switch tab bar above the Pricing section.** The canvas variant places a
  3-tab switcher ("Essentials / Pro Operator / Elite") above the cards. The tabs are decorative
  in the canvas (no behavior) and wiring them up to actually toggle the card content would
  require per-tier item lists and state. Defer to a follow-up story.
- **TopBar color change.** The canvas variant swaps the white TopBar for a navy gradient. This
  contradicts `DESIGN.md` §3.1 (landing uses white card surface, navy is reserved for admin
  shell). Keep the white TopBar as-is.
- **StatsStrip background swap to navy.** Same design-system reason as TopBar.
- **Method section centered single-column.** The existing sticky numbering + lede layout is
  on-brand and informative; the variant's centered treatment loses the section-nav rhythm.
- **Section padding compression.** The variant reduces `padding: clamp(64px,9vw,120px) 0` to
  `clamp(48px,7vw,90px) 0`. Could destabilize section rhythm on first pass; leave as a
  follow-up if review surfaces the change as needed.

## Acceptance criteria

- [ ] Hero renders the conversion chip, the 3-up price ladder, the new CTAs, and the new
      LIVE PREVIEW badge with correct responsive behavior at 360 / 768 / 1240 px.
- [ ] All new copy uses verified claims (`PUBLIC_CURRICULUM_CLAIMS` for module / simulator
      counts; verified price points). No invented metrics.
- [ ] The new components consume design tokens only — no hardcoded colors, spacing, radii.
- [ ] Existing accessibility contracts preserved: aria-labelledby on hero section, focus
      visible, 44px+ mobile touch targets on the new chip / cards.
- [ ] `pnpm tsc --noEmit` green.
- [ ] `pnpm lint` green (boundary rule still rejects `--c-*` bypass).
- [ ] `pnpm test` green; new UI regression test covers the hero price-ladder render + the
      "Most picked" badge presence.
- [ ] Lighthouse mobile ≥ 95 (hero paint unchanged or better).

## Files

- New: `src/components/landing/HeroPriceLadder.tsx`
- New: `src/components/landing/HeroPriceLadder.module.css`
- New: `src/components/landing/__tests__/HeroPriceLadder.test.tsx`
- Modify: `src/components/landing/Hero.tsx`
- Modify: `src/components/landing/Hero.module.css`
- Modify: `src/components/landing/Pricing.tsx` (re-use the ladder's "Most picked" data lookup
  so the two surfaces stay in sync — the Pricing section still renders the existing tier
  cards; we just add a sibling compact ladder in the hero.)

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(landing): …`.
- PR opened against `main`.
- Story status line updated to `Done.`.

## Risks

- The headline copy change ("taught for VAs starting from zero." instead of "new to the
  platform.") is a deliberate tightening but should be A/B tested in production once shipped.
- Replacing the floating ACoS stat chip with the LIVE PREVIEW badge removes the only place
  where a sample numerical claim (24.3% ACoS) was visible. The new badge's "ACoS 18.4%" claim
  is also a sample; needs to be sourced from a published scenario if we want to back it.