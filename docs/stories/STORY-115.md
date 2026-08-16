# STORY-115 — Repair lesson content spacing and responsive layout

**Sprint:** Learning experience uplift, wave 0

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress on the lesson-layout branch.

## Goal

Make the lesson reading surface dependable for a beginner working through
tables, examples, and quiz previews on a phone or desktop. Content should keep
its visual hierarchy without overlapping or forcing the entire page wider than
the viewport.

## Scope

- Add an intentional Markdown table treatment with aligned headers, cell
  spacing, readable borders, and contained horizontal scrolling on narrow
  screens.
- Normalize first/last block spacing and keep code, images, and blockquotes
  from overflowing the reading column.
- Keep long quiz prompts inside the question card beside their number.
- Add source-level responsive layout contracts for the renderer CSS.

## Acceptance criteria

- Markdown tables remain aligned and scroll within the lesson surface on mobile.
- Long words and quiz prompts wrap without overlap or page-level horizontal
  scrolling.
- Lesson blocks have predictable spacing at the start and end of the body.

## Verification

- Focused renderer and layout contract tests pass.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
