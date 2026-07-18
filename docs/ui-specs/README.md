# UI Specs — Field Manual Design System

This folder is the handoff for UI-heavy stories (Sprint 10 admin panel, future dashboard/courses/tools, etc.).

## Files

| File | What it is |
|---|---|
| `DESIGN-SPEC.md` | **Start here.** The distilled design system: tokens, components, motion, layout patterns, page composition, accessibility. **No marketing copy** — design only. |
| `STITCH-PROMPTS.md` | The original 1555-line Stitch prompt from the parent `amph-v2` repo. Kept for archive; contains brand-specific copy that was stripped from `DESIGN-SPEC.md`. Use for layout patterns only. |
| `refs/` | React/TS reference files pulled from the parent `amph-v2` repo (admin/users page, dashboard page, home page, etc.). Reference code patterns when building components. |

## How to use it

When you're about to build a UI story:

1. **Read `DESIGN-SPEC.md` sections relevant to the page type** (e.g. for an admin list page, read §9.3; for a tool page, read §8.6).
2. **Check the component inventory in §14** — if the components you need aren't built yet, plan a prep story first.
3. **Pull a reference file from `refs/`** if you need a real code example to anchor the patterns.
4. **Use the existing `globals.css` tokens** (or extend them in the prep story if missing).

## What's NOT here

- Brand voice / copy guidelines — see `docs/voice-guide.md` for that
- Story-specific copy — write the actual UI text in the story itself, do not pull from Stitch prompts
- Figma files — there are no Figma files in this repo. The Stitch prompts are the source of truth for layout.

## When to update

- New component pattern established → add to §5 of `DESIGN-SPEC.md`
- New layout pattern → add to §8 or §9
- Greenfield gap filled (component built, token added) → remove from §14
