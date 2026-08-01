# skill-picker

Deliberate cross-skill reasoning for Claude Code — picks the right skill from your library when auto-selection isn't good enough.

## Context

Once you have more than ~10 skills installed, Claude's default auto-selection gets noisy. Multiple skills with overlapping descriptions start competing for the same trigger keywords, and the obvious picks are often subtly wrong while a better-targeted skill lives just outside the shortlist.

`skill-picker` is for those moments — when you want a deliberate, rigorous pick instead of a probabilistic one.

## What it does

Given a task description, `skill-picker` will:

1. **Shortlist** 3-5 candidate skills from your available-skills list
2. **Deep-read** each candidate's actual `SKILL.md` (not just the one-line description)
3. **Return a structured recommendation** — rejected candidates with reasons, better matches with evidence, primary + chain + tactical follow-up
4. **Offer a handoff** — invoke the primary skill now, generate a plan first, or stop at the recommendation

The key move is the deep-read step. Descriptions are hypotheses; `SKILL.md` bodies are what the skill actually does. `skill-picker` forces you (or Claude) to look past the hypothesis before committing.

## Usage

**Designed for manual invocation.** Auto-selection is exactly the thing that gets unreliable as your library grows, so reach for the picker yourself when you want a rigorous pick.

```
/skill-picker help me brainstorm where to add color to my portfolio site
/skill-picker which skill should I use to audit UI copy
/skill-picker I want to review an existing component for polish
```

It may also auto-fire when Claude is genuinely uncertain — but don't rely on that; explicit invocation is the primary path.

## Example output

Task: *"help me brainstorm where to apply more color to my portfolio site"*

```
Out of your 4 likely candidates, none is the right fit. Here's my read:

### Why these candidates aren't ideal
- `i-frontend-design` — Over-scoped description.
  Workflow evidence: "production-grade code generation."
  Aimed at shipping code, not exploring palette strategy.
- `interface-craft` — Audience or tone drift.
  Workflow evidence: "storyboard animation DSL."
  Motion-focused, light on color.
- `make-interfaces-feel-better` — Output mismatch.
  Workflow evidence: "hover states, shadows, borders."
  Detail polish, not systemic color.

### Better matches
1. `i-colorize`
   Description: "Add strategic color to features that are too monochromatic."
   Workflow evidence: "make interfaces more engaging and expressive."
   Literal bullseye for the task.

2. `visual-taste`
   Description: "CALIBRATED with your personal taste preferences."
   Workflow evidence: "concrete color, typography, and layout rules."
   Taste filter on top of color direction.

3. `i-extract`
   Description: "Identifies opportunities for systematic reuse."
   Workflow evidence: "design tokens and patterns."
   Frames the problem as "the gold/blue is a latent token."

### My recommendation
Primary: `i-colorize` as the main lens.
Chain (optional): `visual-taste` as a taste filter.
Skip `i-extract` unless the brainstorm converges on "we need tokens."

### Tactical follow-up
Once you've landed on a direction, `oklch-skill` is the right tool for
picking actual values.
```

## How it works

- **Hybrid discovery** — shallow shortlist from the available-skills list, then deep verify by reading each finalist's `SKILL.md`
- **Mismatch taxonomy** — five named patterns (*Over-scoped description, Outdated trigger list, Hidden prerequisite, Output mismatch, Audience or tone drift*) that force specific rejections instead of vague ones
- **Evidence quotes** — every rejection and recommendation must cite a verbatim phrase from the skill's `SKILL.md` body, proving the deep-read actually happened
- **Handoff gate** — three options after the recommendation: invoke now, generate a plan first, or stop

## Who it's for

Users with more than ~10 installed skills across user-level, project-level, and plugin sources. That's roughly where auto-selection starts getting unreliable. If you have fewer, the default works fine.

## Gotchas

- Never recommends skills that aren't actually installed (hallucination guard)
- Quotes descriptions and workflow bodies word-for-word — no paraphrasing
- Excludes itself from the candidate pool by default
- Requires the handoff gate before invoking any recommended skill — recommending is not running

See [SKILL.md](SKILL.md) for the full list.

## Requirements

- **Claude Code** — the `AskUserQuestion` tool powers the handoff gate. Other agents can still use the skill, but the handoff falls back to text-only prompts.

## Install

```bash
npx skills add kylezantos/skill-picker
```

Or manually: copy the `skill-picker/` directory into `~/.claude/skills/`.

## License

MIT
