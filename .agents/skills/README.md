# Agent skills

This directory holds [OpenCode agent skills](https://opencode.ai/docs/skills/) the
project installs for every agent run. OpenCode auto-discovers any
`SKILL.md` placed in `.agents/skills/<name>/` and lists it in the `skill`
tool description so the agent can load it on demand.

`.agents/` is in `.gitignore` to keep agent-runtime markers out of the
repo, but the **skill folders themselves are force-tracked** via
`git add -f` so the project ships a known skill set to every clone.

## What's installed

| Skill | Source | Purpose |
| --- | --- | --- |
| `amph-v2-greenfield` | local | Project-specific conventions (companion to `AGENTS.md`) |
| `code-review` | [`LeventySeven/compound-v`](https://github.com/LeventySeven/compound-v) | On-demand and pre-merge reviewer for a PR / branch / uncommitted diff. Severity-tagged findings; can post to GitHub or apply fixes. |
| `requesting-code-review` | [`obra/superpowers`](https://github.com/obra/superpowers) | Pre-review checklist before sending a branch for review. Verifies spec, integration, and understandability. |
| `receiving-code-review` | [`obra/superpowers`](https://github.com/obra/superpowers) | Apply review feedback one item at a time, evaluating each suggestion rather than mechanically accepting. |
| `verification-before-completion` | [`obra/superpowers`](https://github.com/obra/superpowers) | Run lint, tests, build, and review-evidence checks before claiming work is done. Evidence before assertions, always. |
| `systematic-debugging` | [`obra/superpowers`](https://github.com/obra/superpowers) | Root-cause-first 6-phase debugging protocol for any bug, test failure, or unexpected behavior. |

## Adding a new skill

1. Pick the source. Top opencode skill repos include
   [`obra/superpowers`](https://github.com/obra/superpowers) (canonical),
   [`LeventySeven/compound-v`](https://github.com/LeventySeven/compound-v)
   ("Superpowers, but better").
2. Drop the upstream `SKILL.md` under `.agents/skills/<name>/SKILL.md`.
   The folder name must match the frontmatter `name` field, and both must
   satisfy `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase alnum, single hyphens).
   The `description` field must be 1–1024 chars.
3. Force-track it: `git add -f .agents/skills/<name>`. The `.gitignore`
   `agent/`-style rules on `.agents/` are about the runtime marker
   files, not the curated skill folders.
4. Add a row to the table above so the provenance is auditable.

## Per-agent overrides

Skills can be denied or auto-loaded for specific agents in
`opencode.json`:

```json
{
  "agent": {
    "plan": {
      "permission": { "skill": { "code-review": "ask" } }
    }
  }
}
```

Pattern wildcards work: `"internal-*": "deny"` blocks any
`internal-*` skill from being listed.

## Conventions

- Skill folder names match the skill `name` exactly (opencode
  requirement).
- Description text in the frontmatter is the agent's only signal for
  whether to load a skill, so it has to be specific enough to choose
  correctly and short enough to fit in the tool description budget.
- This file tracks provenance so a future reviewer can see which repo a
  skill came from when checking for upstream drift.