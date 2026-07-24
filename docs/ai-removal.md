# AI Removal — Project Amazon PH Academy v2

**Status:** Approved (Day 0, greenfield)
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17

---

## Background

Project Amazon PH Academy does not use any external AI APIs. This is a product decision, not a technical limitation. ADR-003.

This document records what AI features the platform deliberately does **not** have, and what replaced them. It exists so future contributors don't propose adding them back without understanding the rationale and the replacement that's already shipping.

## What AI Used To Do (in the imagined product, never shipped)

In an early prototype, the team floated the following AI features:

1. **AI mentor chat.** "Ask anything about Amazon PPC, get a personalized answer." Powered by an LLM.
2. **AI mistake analysis.** "Upload a campaign screenshot, get a list of mistakes and how to fix them." Vision model.
3. **AI ad copy generator.** "Describe your product, get 5 headline options." LLM.
4. **AI listing optimizer.** "Paste a listing, get a rewritten version." LLM.
5. **AI scenario generator.** "Describe a product, get a full Bid Elevator scenario." LLM.
6. **AI quiz explainer.** "Stuck on a quiz question, get a hint." LLM.

## Why They Were Removed

| Reason          | Detail                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cost            | Per-call API costs make unit economics hostile at our price point. A single chat-heavy user could exceed the ₱2,999 course price in API spend within a week. |
| Reliability     | LLM outputs are not deterministic. A "personalized answer" that contradicts a senior PPC review teaches the wrong thing.                                     |
| Latency         | Chat and vision APIs add 2–8s latency. The 2am rule says: a student waiting 6s for a hint is a student who closes the tab.                                   |
| Privacy         | Course content + user inputs would be sent to third parties. Some inputs are real client data (campaign screenshots). Out of scope for our privacy posture.  |
| Quality control | Project Amazon PH Academy teaches a specific way to do PPC. AI outputs would drift, mix in outdated or wrong advice, and confuse students.                   |
| Audience trust  | Filipino VAs are rightly skeptical of AI marketing. "AI-powered" reads as a red flag, not a feature.                                                         |
| Compliance      | Sending user data to LLM providers creates data-residency questions. We don't need the question.                                                             |

## What Replaced Each Feature

| Removed feature       | Replacement                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AI mentor chat        | (Not replaced. Students ask in Discord, where Ryan and senior VAs answer.)                                                                      |
| AI mistake analysis   | The 5 simulators. Each gives a deterministic, explainable score with per-check reasons. You can see exactly which rule you broke and why.       |
| AI ad copy generator  | The Campaign Builder simulator. Teaches the structure first. Students write the copy in their own portfolio work.                               |
| AI listing optimizer  | The Listing Audit simulator. Same shape as the mistake-analysis replacement: deterministic checklist, per-section score, concrete fixes.        |
| AI scenario generator | Admins (Ryan + co-admins) hand-author scenarios. The scenario authoring is part of the curriculum design work. Encoded as JSON in the database. |
| AI quiz explainer     | Each quiz question has a hand-written `explanation` field. Wrong answers route the student to the relevant lesson section.                      |

## What This Means in Code

The ESLint rule `local/no-ai-packages` blocks these from `package.json`:

- `openai`
- `anthropic` (and `@anthropic-ai/sdk`)
- `langchain`, `@langchain/*`
- `llamaindex`
- `cohere`
- `replicate`
- `together`
- Any package whose description contains "LLM" or "language model"

If a future contributor wants to add a real AI feature, they need to:

1. Open a new ADR explaining why the deterministic replacement is insufficient.
2. Get product sign-off.
3. Add a `AIFeature` interface in `src/ports/services/AIFeature.ts` (an "AI" port, ironically). Implement with whatever provider.
4. Wire it into the composition container.
5. Pass the same scrutiny as any new use case (tests, audit log, privacy review).

The bar is "the deterministic replacement is provably insufficient," not "AI would be cool here."

## How This Affects Voice

The voice guide (`docs/voice-guide.md`) bans phrases like "AI-powered", "intelligent", "smart", and "learns from you." Those are AI marketing words. The platform talks about what the platform does (deterministic simulators, hand-authored content, real instructor feedback), not about how clever it is.

## What About ML on Our Own Data?

We don't do it. The `ProgressEvent` log could feed a model someday, but the model would run as a batch job on aggregated, anonymized data, not in the request path. Not planned for v2.

## What About Embeddings or Vector Search?

We don't use them. The content is small (5 simulators × ~20 scenarios = 100 scenarios; 3 courses × ~5 modules × ~5 lessons = 75 lessons). Search is keyword search. Filter + sort. The volume does not justify a vector index, and the use cases (find a scenario, find a lesson) are exactly what keyword + tag filters handle well.

## What About "AI Slop" in Copy?

Separate from the "no AI features" decision, the platform also bans AI-generated marketing copy in lessons, UI, and emails. The voice guide is the spec. The ESLint rule `local/no-ai-slop` is the enforcement. The reasoning: AI copy reads like AI copy. Filipino VAs notice. Real PPC specialists notice. Ship human copy.

## What About Accessibility AI (alt text, etc.)?

Hand-written alt text. No image-recognition API. The cost of an accessibility miss is real, but the cost of "AI-generated alt text that doesn't actually describe the image" is worse than no alt text (it actively confuses screen reader users). Editors write alt text or the image doesn't ship.

## What About Translation?

Day 0: English only. v2.1 may add Tagalog. The translation will be human, not machine. ADR-020.

## Decision Trail

- 2026-07-07: ADR-003 accepted. Zero external AI features.
- 2026-07-17: Greenfield rebuild. ADR-003 carries over unchanged. This document is the supporting record.

If you want to revisit: open a new ADR, link to this one, explain why the situation has changed, propose the specific feature with a specific deterministic replacement that has been considered and rejected. Default is "stay the course."
