---
name: skill-picker
description: "Recommends the best skill(s) to use for an ambiguous or multi-skill task by deep-verifying candidates against their SKILL.md contents, not just their one-line descriptions. Use when the user asks 'which skill should I use', 'what skill is best for X', 'help me pick a skill', 'find the right skill', 'what's the most targeted skill', or when several installed skills seem to overlap and the right choice isn't obvious. Also use proactively when a user's task could plausibly match 3+ skills with similar descriptions and you're genuinely uncertain which to reach for. Returns a structured recommendation with rejected candidates, better matches quoted from their actual descriptions, a primary skill + optional chain + tactical follow-up, and a handoff gate."
argument-hint: "[what you want to work on]"
allowed-tools: Read, Glob, Grep, AskUserQuestion
---

# Skill Picker

Deliberate cross-skill reasoning for when auto-selection isn't good enough. The core insight: descriptions can lie. A skill's one-liner says X, but its SKILL.md does Y. Shallow matching fails exactly when it matters most — when the task is ambiguous and several skills seem close. This skill forces deep verification before recommending.

## Quick Start

**Example invocations:**
> "/skill-picker help me brainstorm where to add color to my portfolio site"
> "/skill-picker which of my skills should I use to audit UI copy"
> "/skill-picker I want to review an existing component for polish — what's best"

The user passes a task description. You return a structured recommendation.

---

## How This Skill Thinks

1. **Descriptions are hypotheses, not facts.** A one-line description is how a skill *wants* to be invoked. The SKILL.md is what it actually does. Always verify finalists by opening the file.

2. **The model already rejected some candidates silently.** When shallow auto-selection picks 3-5 candidates, it's worth asking: what did it miss? The screenshot failure mode (4 obvious picks were all wrong, 3 better ones lived outside the obvious set) repeats often.

3. **Quote word-for-word, from two sources.** Never paraphrase. For each recommendation, the user should see both (a) the skill's description verbatim and (b) a short verbatim phrase from its SKILL.md body. The body quote is the fingerprint proving you deep-read. Paraphrasing is where hallucination lives, and description-only is where freestyle guessing lives.

4. **Recommend chains, not just singles.** Many real tasks need a primary skill + a follow-up (e.g., `i-colorize` then `visual-taste` as a taste filter, then `oklch-skill` for value picking). Surface these explicitly.

5. **Never recommend a skill that doesn't exist in the user's available-skills list.** If you can't point to it in the current context reminder, it isn't installed. Don't invent skills from training data.

---

## The Algorithm

### Step 1 — Intake

Read the user's `$ARGUMENTS` as the task they want help with. If arguments are empty, ask one question:

> What task are you trying to accomplish? Describe it in your own words — I'll match it against your installed skills.

### Step 2 — Shallow Pass (candidate shortlist)

Look at the available skills list in your current context (the `<system-reminder>` block that lists skills, or the tool harness's available-skills section). **Do not invent skills.** Only reason from what's actually listed.

Scan all skill names + one-line descriptions. Pick **3-5 candidates** that plausibly match the task. Include both obvious fits and non-obvious ones — the failure mode is missing a non-obvious better match.

Also identify **2-3 "obvious but probably wrong"** candidates — skills that look like a fit on first glance but might be too broad, too narrow, or aimed at a different problem. You'll explain why you rejected them.

### Step 3 — Deep Verify (read SKILL.md for each finalist)

For each of the 3-5 shortlisted candidates, locate and read its SKILL.md. Try paths in this order:

1. **User-level:** `~/.codex/skills/<name>/SKILL.md`, `~/.claude/skills/<name>/SKILL.md`, then `~/.agents/skills/<name>/SKILL.md`
2. **Project-level:** `./.codex/skills/<name>/SKILL.md`, `./.claude/skills/<name>/SKILL.md`, then `./.agents/skills/<name>/SKILL.md` relative to the current working directory
3. **Plugin-provided** (names with colon like `compound-engineering:ce-work`): Glob for `~/.codex/plugins/**/skills/<skill-part>/SKILL.md`, `~/.claude/plugins/**/skills/<skill-part>/SKILL.md`, or broader `~/.codex/**/skills/<skill-part>/SKILL.md` / `~/.claude/**/skills/<skill-part>/SKILL.md` matches — the part after the colon is the skill name.

If you cannot locate a skill's file, note it in the output (don't fabricate its contents).

For each SKILL.md opened, scan its workflow/instructions body (not just frontmatter) and look for one of these **five mismatch patterns**:

#### The Mismatch Taxonomy

1. **Over-scoped description** — The one-line description implies broad capability, but the workflow only handles a narrow slice. Detector: description says "polish" or "audit" or "review" but the workflow's Phase 1 asks for specific artifacts (screenshots, a component file, a specific framework).

2. **Outdated trigger list** — The trigger keywords listed in the description don't match what the workflow actually branches on. Detector: description lists keyword X, but "Mode A vs. Mode B" routing inside the skill never looks for X.

3. **Hidden prerequisite** — The workflow assumes installed tooling, a design system, a file structure, or a prior skill output that the description never mentions. Detector: Phase 1 of the workflow says "ensure you have X installed" or "paste the output of skill Y here" but the description makes no mention of X or Y.

4. **Output mismatch** — The description promises one kind of artifact; the workflow produces something different. Detector: description says "recommends..." but the final phase writes files, or description says "generates code" but the workflow outputs a markdown report.

5. **Audience or tone drift** — The description sounds generic, but the workflow is calibrated to a specific user, stack, or aesthetic. Detector: principles or examples in the workflow name specific people, companies, or frameworks the description didn't mention.

For each finalist, record:
- **Actual scope** (one sentence from reading the workflow, not the description)
- **Mismatch pattern(s) found**, if any — cite by name from the taxonomy above
- **Evidence quote** — a short phrase (5-15 words) copied verbatim from the SKILL.md body, with a rough section reference. This is the fingerprint proving you deep-read; include it in the output.

#### Worked Example

User task: *"help me polish my API documentation"*

Shortlist includes `i-polish` (description: "Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.").

Shallow read: sounds like a match — polish is polish, right?

Deep read of `i-polish/SKILL.md` reveals Phase 1 asks for a screenshot of the UI and Phase 2 references "optical alignment" and "border radius." The workflow is calibrated to **visual UI polish**, not documentation polish.

Mismatch pattern: **Over-scoped description** ("polish" is broader than what the skill does).

Output line: *"`i-polish` — Over-scoped description. Workflow body calls for 'optical alignment' and 'visual hierarchy', aimed at UI not prose. Not a fit."*

That quoted phrase is the fingerprint. Without it, the rejection is freestyle.

### Step 4 — Structured Recommendation

Produce the output using the template below. Use the exact structure.

### Step 5 — Handoff Gate

After the recommendation, ask the user how they want to proceed using AskUserQuestion with these three options:

1. **Invoke the primary skill now** — Hand off directly to the recommended skill with the original task prompt
2. **Generate a plan first** — Write a full markdown plan document showing how the recommended skill (plus any chain) will be applied to the task, so the user can review before running anything
3. **Just the recommendation** — Stop here; the user will invoke manually when ready

---

## Output Template

Use this exact structure. Copy the shape; fill in the content.

```markdown
Out of your [N] likely candidates, [none / only one / two] is the right fit for this task. Here's my read:

### Why these candidates aren't ideal

Each rejection must cite one of the five mismatch patterns and include an evidence quote from the skill's SKILL.md body (not its description).

- **`skill-name-1`** — [Mismatch pattern name]. Evidence from its workflow: *"short quote, 5-15 words"*. [One-line conclusion.]
- **`skill-name-2`** — [Mismatch pattern name]. Evidence: *"quote"*. [Conclusion.]
- **`skill-name-3`** — [Mismatch pattern name]. Evidence: *"quote"*. [Conclusion.]

*(If you couldn't locate a skill's SKILL.md, explicitly tag the line as `description-only — file not located` instead of faking evidence.)*

### Better matches

Each recommendation must include BOTH (a) the skill's description quoted word-for-word AND (b) a second quote from its SKILL.md body showing the actual workflow aligns.

1. **`better-skill-1`**
   - Description: *"exact text from the description field"*
   - Workflow evidence: *"short quote from the body, 5-15 words"*
   - Why it fits: [one sentence]

2. **`better-skill-2`**
   - Description: *"..."*
   - Workflow evidence: *"..."*
   - Why it fits: [one sentence]

3. **`better-skill-3`**
   - Description: *"..."*
   - Workflow evidence: *"..."*
   - Why it fits: [one sentence]

### My recommendation

**Primary:** `better-skill-1` as the main lens.
**Chain (optional):** Follow with `better-skill-2` to [specific reason — e.g., "filter through your taste preferences"].
**Skip:** `better-skill-3` unless [specific condition that would trigger it].

### Tactical follow-up

Once you've landed on a direction, `tactical-skill` is the right tool for [specific downstream step — e.g., picking actual color values].

---

Want to proceed?
```

The evidence quotes are non-negotiable. They are the audit trail proving you actually opened each skill's file. Without them, the recommendation is unverifiable — it might as well be default model guessing.

After this output, trigger the handoff gate (Step 5).

---

## Handoff Modes

### Mode A: Invoke the primary skill now

Hand off by invoking the recommended skill via the Skill tool with the user's original task as the argument. If the recommendation includes a chain, only invoke the primary — let the chained skill fire separately after the primary completes.

### Mode B: Generate a plan first

Write a full markdown plan document with this structure and present it inline:

```markdown
# Plan: Applying [primary-skill] to [task]

## Context
[2-3 sentences restating the user's task and what they're trying to accomplish.]

## Recommended workflow

### Step 1 — Run `primary-skill`
- **What this does:** [summary]
- **Expected output:** [what the user will see]
- **Input:** [how to invoke — e.g., "/primary-skill <task description>"]

### Step 2 — Chain `secondary-skill` (if primary converges on X)
- **Trigger condition:** [when to run this, when to skip]
- **What this does:** [summary]
- **Expected output:** [what the user will see]

### Step 3 — Tactical follow-up with `tactical-skill`
- **What this does:** [summary]
- **Input:** [how to invoke]

## Decisions the user needs to make
- [Decision 1 — what to choose and when]
- [Decision 2]

## What this plan intentionally skips
- [Alternative approach 1] — reason for skipping
- [Alternative approach 2] — reason for skipping
```

After writing the plan, ask:

> Plan looks good? I can kick off Step 1 now, or you can run it manually.

### Mode C: Just the recommendation

Stop. The user will invoke manually.

---

## Gotchas

Common failure points — where this skill gets it wrong:

- **Don't skip the deep-verify step on finalists.** The whole value of the skill is catching description-vs-reality mismatches. A shallow-only pass is what the model does by default — adding a skill that just does the shallow pass again is worthless.

- **Don't recommend skills that aren't in the user's available-skills list.** Training data includes skill names from docs and public repos. If the skill isn't in the current context reminder, it isn't installed. Don't hallucinate.

- **Don't paraphrase descriptions when recommending.** Quote word-for-word from the skill's actual description field. Paraphrasing drifts the meaning and loses user trust when they notice.

- **Don't recommend `skill-picker` itself as a candidate.** Exclude this skill from the pool on every pass. Exception: if the user seems genuinely lost on a meta-task like "I can't figure out which of my skills do what" — then it's appropriate to point them at this skill. But never recommend it for an object-level task.

- **Don't auto-chain without the handoff gate.** The structured output is a recommendation, not an instruction. Always go through the handoff question before invoking anything. Exception: if the user's original prompt explicitly said "pick the right skill and run it" — then you have pre-authorization and can skip the gate.

- **Don't treat plugin-prefixed skills as user-level.** A name like `compound-engineering:ce-work` means the file lives in a plugin directory, not directly under a user-level `skills/` folder. Use Glob to find it — don't assume a path.

- **Don't recommend more than 3 skills as "better matches."** If you're returning 5+ options, you haven't actually picked — you've passed the buck back to the user. Pick.

- **Don't reason about skills without reading their SKILL.md.** If you couldn't locate the file, say so explicitly in the output ("couldn't locate SKILL.md for X — reasoning from description only"). Don't pretend you read it.

- **Don't force a "rejected candidates" section when the first-pass picks were actually correct.** If the obvious candidates genuinely are the right answer, say so: "The obvious candidates were right. Here's why." The skill's value is rigorous analysis, not manufactured contrarianism.

- **Don't skip the evidence-quote requirement.** Every finalist in the output must include a short verbatim quote from the skill's SKILL.md body — not from its description. This is the audit trail that proves you deep-read. If a reader can't point to which file each quote came from, you've freestyled. The only legitimate exception is when a skill's file couldn't be located: in that case, tag the line explicitly as `description-only — file not located` so the user knows.

- **Don't match a mismatch pattern without naming it.** When you reject a candidate, cite one of the five taxonomy names (Over-scoped description, Outdated trigger list, Hidden prerequisite, Output mismatch, Audience or tone drift) explicitly. "It didn't feel right" isn't analysis. If none of the five patterns apply, the skill might actually be a fit — reconsider whether to reject it.

---

## Scope: What This Skill Considers

This skill should consider skills from all three locations:

1. **User-level skills** — `~/.codex/skills/*/SKILL.md`, `~/.claude/skills/*/SKILL.md`, and `~/.agents/skills/*/SKILL.md`
2. **Project-level skills** — `./.codex/skills/*/SKILL.md`, `./.claude/skills/*/SKILL.md`, and `./.agents/skills/*/SKILL.md` when a current project has them
3. **Plugin-provided skills** — Appear in the available-skills list with colon-prefixed names (`plugin:skill-name`). Located via Glob in plugin directories.

The available-skills list in the current context is the authoritative source of "what's installed right now." Start from that list. Do not attempt to recommend from memory of past installations.

---

## Working With Incomplete Information

If the user's task description is too vague to do meaningful matching:

> Your description is pretty open-ended. A few specifics would sharpen the pick:
> - What's the artifact you're working on? (component, page, full site, doc, etc.)
> - What's the goal? (polish, build from scratch, audit, refactor, explore)
> - Any constraints? (specific framework, design system, platform)

Don't guess — wrong matches waste more time than asking.
