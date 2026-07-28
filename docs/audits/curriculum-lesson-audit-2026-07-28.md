# Curriculum Lesson Audit — applied-lesson-craft standards

**Audited:** 8 lessons across 6 modules (0.1, 1.3, 1.5, 2.2, 4.1, 6.1, 7.1, 8.3)
**Against:** `applied-lesson-craft` skill (loaded from `C:/Users/Agent/.minimax/skills/applied-lesson-craft/SKILL.md`)
**Date:** 2026-07-28

---

## Overall verdict

The curriculum content is **structurally solid and practically strong** — real numbers, consistent format, client language sections, and the Read → Decide → Change → Explain work loop are all genuine wins. But it scores **poorly on the applied-lesson-craft standards** for five structural reasons, none of which require rewriting from scratch:

1. No stated audience profile in any individual lesson
2. No named false belief per lesson (the central reframe is missing)
3. No memorable visual per lesson (the screenshot test fails)
4. AI-prose patterns survive in the analogies and the formulaic "Your turn" structure
5. The format is the same for every lesson — which trains the learner to skim, not engage

---

## 1. Audience reality check (Step 1 of the skill)

**Standard:** Name who the learner is, what they do wrong, what good looks like, what they already tried that failed, and the false belief driving their bad decision.

**Finding: absent in every lesson except 0.1.**

The curriculum-level audience is defined in `CURRICULUM-INDEX.md` (Philippine VAs, Amazon PPC work, the VA service market) and the onboarding lesson (0.1) sets the work loop, but individual lessons never restate who the learner is or what they currently do wrong. A learner dropping into 1.3 (ACoS) gets the content without knowing whether they're a new VA who just ran their first campaign, a VA who has been guessing at ACoS for months, or a seller learning PPC for the first time.

**Module 0 does the audience work** — 0.1 names the VA role, the three courses, and the work loop. This is the strongest lesson in the curriculum on audience grounding. It should be the template, not the exception.

**What 1.3 should say explicitly (example):**

> The learner is a new VA who just opened their first client report and is panicking because ACoS is 50%. They have probably Googled "what is a good ACoS" and gotten answers that assume a mature account. They do not know about break-even ACoS or the launch ACoS exception. False belief: ACoS above target means the campaign is broken.

**What every lesson should include** (at minimum):

- One sentence on who the learner is in this lesson's context
- One sentence on what they currently do wrong
- One sentence on the false belief the lesson corrects (see §3)

---

## 2. Learning aids (Step 2 of the skill)

**Standard:** 2 to 4 aids from different memory systems: anchor (story, analogy, demo), make-it-real (worked example, screenshot, transcript), do-it (exercise, checklist), check (quiz, self-assessment).

**Finding: consistent but monotonous.**

The curriculum uses a fixed mix per lesson:

- One analogy (varies in quality — see §6)
- One worked example with real numbers (strong — this is the best aid in the curriculum)
- One "Your turn" practice section
- One "Quick check" quiz
- One "Client language" template

This mix is practical and repeatable. The worked examples are genuinely strong — concrete products, specific prices, verified math, week-over-week trajectories. 1.3's yoga mat (week 1: $300 spend, $600 sales, 50% ACoS → week 3: $250/$550, 45% ACoS) and 1.5's kitchen scale (week 1 → week 3 → week 6) are the best content in the curriculum precisely because they show the before/after and the trajectory.

**But three problems:**

**Problem A — same aid structure every lesson.** Every lesson follows: analogy → worked example → "Your turn" → client language → quick check. This is a good format, but predictability is a learning enemy. The learner knows the shape before they read the content. The analogy always comes in the first two paragraphs. The "Your turn" always appears after the worked example. The "Key Takeaways" are always a bulleted list. This trains skim-reading.

**Problem B — no memorable visual.** The skill requires naming "the one visual the learner will screenshot." The curriculum has almost no visual identity. 2.2 has a ASCII flowchart (keyword workflow). 8.3 has a competitive review cadence table. These are memorable. Almost nothing else is. The worked example numbers in 1.3 are memorable because they're specific and sequential — a screenshot-worthy moment — but the lesson doesn't call this out or frame it as the visual to remember.

**Problem C — analogies are generic.** The fishing analogy (keywords are lures, search terms are fish), the grocery analogy (weekly search term triage is like a grocery run), the toolbox analogy (organize keywords like tools) — all of these are true but forgettable. The best analogies in the curriculum are the ones with real specifics: 6.1's taxi analogy (Fixed = flat-rate taxi, Dynamic = surge pricing, Dynamic Down Only = taxi with a discount), 7.1's milk frother examples (with specific CVR and CTR numbers), 8.3's competitor watchlist entries with real brand descriptions. Specific > generic.

---

## 3. Lesson skeleton (Step 3 and 4a of the skill)

**Standard:** Each lesson should have a stated central reframe: "By the end, the learner will stop believing ___ and start believing ___."

**Finding: stated in 8.3 only. Implied everywhere else.**

8.3 has an explicit "The Why" section with a practitioner quote about data hoarding. The other lessons have "The decision in one sentence" which is close — it states the lesson's operational claim — but it's not the same as the reframe.

The reframe is what makes a lesson memorable. 1.5's reframe should be: _"Stop reading individual metrics. Start reading the pattern."_ 1.3's reframe should be: _"Stop treating ACoS as a verdict. Start treating it as a score you can move."_ 7.1's reframe: _"Stop guessing which search terms to keep. Start using CTR, CVR, and ACoS as a triage signal."_

These reframes are in the content. They're just not called out. Calling them out makes the lesson easier to teach, easier for the learner to recall, and easier to reference in a simulator or a quiz.

**What this costs:** without named reframes, the curriculum cannot be mapped to simulator scenarios. The simulator engines (bid-elevator, campaign-builder, listing-audit, str-triage) need to know what decision the learner is practicing. The curriculum has the decisions. They're implicit, not explicit.

---

## 4. Humanizer audit (Step 6 of the skill)

**Standard:** No AI vocabulary, no em dashes, no signposting openers, no generic analogies, no formulaic "Your turn" structure. If a writing sample exists, match its voice.

**Finding: four patterns survive across the curriculum.**

### Pattern A: Generic analogies without specificity

Generic analogies that could appear in any training material:

- 7.1: _"Imagine checking your bank statement and finding $200 charged by a subscription you forgot about."_ — A bank statement analogy for search term analysis. Technically apt but not specific to Amazon PPC, not specific to the learner's work context, and does not have a concrete detail that makes it memorable.
- 7.1: _"Keywords are the fishing lures you throw into the water. Search terms are the fish that actually bite."_ — A fishing analogy. True, used in many PPC courses.
- 7.1: _"Think of this like a weekly grocery run for your campaigns."_ — Grocery analogy. Also generic.
- 4.1: _"Think of match types like a fishing net."_ — Fishing again.
- 2.2: _"Organizing keywords into themed ad groups is like organizing your toolbox."_ — Toolbox analogy.

Specific analogies that work:

- 6.1: _"Think of Amazon's three bid strategies like three ways to pay for a taxi: Fixed = flat-rate ride share, Dynamic Up and Down = surge pricing, Dynamic Down Only = flat-rate with a smart discount."_ — Specific to a familiar experience, memorable, the distinctions map cleanly.
- 7.1: _"You sell a premium milk frother. 'cheap milk frother' triggers your ad but never converts. These shoppers want budget products."_ — Specific product, specific search term, specific buyer intent. The learner can picture this exact conversation.
- 8.3: _"Brand A: Direct competitor, ₱500-800 range, strong on Sponsored Brands / Brand B: Rising competitor, ₱300-500 range, aggressive bidding."_ — These are real enough to be actionable.

**Fix:** for every analogy, ask: could this exact analogy appear in a different training company's course on a different topic? If yes, make it more specific to Amazon PPC and to the learner's VA work context.

### Pattern B: Formulaic "Your turn" / "Work it through" structure

Every "Your turn" section follows the same shape:

1. State a scenario with specific product and numbers.
2. Say "Work this through before checking the answer."
3. Provide the answer labeled "Work it through: [analysis]."

This structure works. It's good practice pedagogy. But it appears in every lesson with zero variation — same position (after worked example, before client language), same phrasing ("Work it through before checking the answer"), same answer format. The learner can predict this section before they see it.

**Fix options:**

- Vary the position. Sometimes put it at the top before the lesson content (diagnostic first, then the concept).
- Vary the format. Sometimes make it a decision tree, a "which of three is wrong" exercise, a fill-in-the-blank template.
- Name the structure. Call it "diagnostic," "practice," "your call," or just "Here's what you'd decide."

### Pattern C: Signposting openers

- 1.5 opens with: _"You now know all six PPC metrics individually."_ — "You now know" is a signposting opener. A real instructor would not say this; they'd say: _"In the real account, you never look at just one number."_
- 7.1: _"Your campaigns are running, clicks are coming in, and Amazon is collecting data."_ — This is a preamble, not a hook. The first sentence of the lesson should be the most important sentence. This one could be cut and the lesson would start stronger with: _"Search term analysis finds the hidden charges draining your budget and kills them."_
- 6.1: _"Before picking a strategy, you need to understand what you can and can't predict about the auction."_ — This is a preamble opener.

### Pattern D: One vague phrase (minor)

- 0.1: _"This loop is what separates a VA who guesses from one a client keeps on retainer."_ — "on retainer" is slightly jargon-heavy for a first lesson. A new learner might not know this phrase.
- 1.5: _"You now know all six PPC metrics individually."_ — Same issue.

These are minor. The overall voice is better than most AI-generated content. The humanizer pass would tighten them but wouldn't transform the writing.

---

## 5. What the curriculum does well (do not lose these)

These are genuinely strong and must be preserved in any rewrite:

1. **The Read → Decide → Change → Explain work loop** (0.1, reinforced throughout). This is the curriculum's spine. Every lesson should reference it.

2. **Real numbers with verified math.** 1.3's yoga mat trajectory (week 1: $300/$600, week 3: $250/$550), 1.5's kitchen scale (week 1 → week 3 → week 6 with actual metric deltas), 6.1's placement multiplier trap with the $1.00 bid × 100% × 50% = $3.00 example. These are the moments the learner will remember. The math should be verified and stated explicitly.

3. **The "Client language" section** in every lesson. This is the most practical feature of the curriculum and the hardest thing to find in other PPC courses. Keep it. Expand it: most lessons have one client language example; some could use two (one for a new-client briefing, one for an in-progress check-in).

4. **"What not to do" warnings.** 1.5's _"Don't lower bids or pause keywords before checking the search terms"_ and 1.3's _"Judge launch campaigns on trajectory, not the day-one number"_ are specific and actionable. These are better than generic tips.

5. **The "decision in one sentence" framing** — it's close to the central reframe, just not named as such. Naming it explicitly would fix the biggest structural gap in the curriculum.

6. **The Week-over-week trajectory examples** (1.3, 1.5) — showing the same product's metrics changing over time is the best teaching device in the curriculum. More lessons should use this pattern.

7. **The Amazon Ads Fact Card** at the end of 6.1 and 7.1. Sourcing claims is good practice. The "[content owner to fill in]" placeholders are a gap, but the intent is right.

8. **8.3's case study format** (competitor benchmarking with real scenario → actions → results). This is the most advanced lesson structure in the curriculum. It should be the model for how advanced lessons differ from foundational ones.

---

## 6. Priority fixes

### Tier 1 (rewrite required — biggest impact)

1. **Add a one-paragraph audience anchor to every lesson.** State who the learner is in this lesson's context and what they currently do wrong. Copy the pattern from 0.1's opening. This is 3–5 sentences per lesson and fixes the biggest engagement gap.

2. **Name the false belief per lesson.** For each lesson, add one line: _"False belief: [what the learner currently believes that is wrong]."_ This becomes the lesson's central reframe. This is the single most impactful addition and costs almost nothing.

3. **Name the one visual the learner will screenshot.** Most lessons don't have one. Add one per lesson: a table, a diagram, a decision tree, a scoring matrix, or a specific screenshot annotation. Call it out explicitly ("This is the table you'll screenshot and use every week"). 2.2's keyword workflow diagram and 8.3's gap analysis matrix are existing examples. Apply this to every lesson.

### Tier 2 (structural improvement — moderate effort)

4. **Vary the lesson structure.** Not every lesson should follow: analogy → worked example → "Your turn" → client language → quick check. Some should open with the diagnostic ("Your turn first — which of these three campaigns has the problem?"). Some should end with the worked example as the climax, not before the midpoint.

5. **Replace the generic analogies.** The fishing, grocery, and toolbox analogies should be replaced with analogies specific to Amazon PPC or to the learner's VA work context. 6.1's taxi analogy is the template: specific to a common experience, the distinctions map cleanly, and the learner can check it against their own Uber ride.

6. **Remove the signposting openers.** Scan every first paragraph. Replace "You now know" and "In this lesson" and preamble openers with the most important sentence of the lesson.

### Tier 3 ( polish — low effort, incremental gain)

7. **Expand the "Client language" section** from one example to two per lesson where possible: one for a new-client briefing, one for an in-session check-in.

8. **Add more Week-over-week trajectories.** The kitchen scale example (1.5) is the best teaching moment in the curriculum. Modules 2 through 8 should all use time-series data showing the same product or account at two or three points.

9. **Fill in the Amazon Ads Fact Card placeholders.** Several lessons have `[content owner to fill in]` and `[Last verified: content owner to fill in at rewrite time]` which are incomplete. These should be filled in or marked as TBD.

10. **Apply the humanizer pass to the analogies and the "Your turn" sections.** Replace the generic analogies (§6 above). Vary the "Your turn" format occasionally. Remove the signposting openers. This is a light pass, not a rewrite.

---

## 7. Summary scorecard

| Dimension                                           | Score | Notes                                                                 |
| --------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| Audience profile stated per lesson                  | ❌    | Only 0.1 does this; all others inherit from the index                 |
| False belief / central reframe named                | ❌    | Content implies it; never stated explicitly                           |
| Learning aid mix (2-4 aids, different systems)      | ⚠️    | Consistent but monotonous; no visual identity                         |
| One memorable visual per lesson                     | ❌    | Only 2.2, 8.3 have screenshot-worthy visuals                          |
| Humanizer pass (no AI patterns)                     | ⚠️    | Generic analogies, formulaic "Your turn," signposting openers survive |
| Concrete numbers and verified math                  | ✅    | Strongest feature; week-over-week trajectories are excellent          |
| Work loop (Read → Decide → Change → Explain)        | ✅    | Present and reinforced; the curriculum's spine                        |
| Client language section                             | ✅    | Excellent and unique; expand to two per lesson                        |
| Lesson structure varied                             | ❌    | Same format every lesson                                              |
| Source/sourcing documented                          | ⚠️    | Fact cards exist; several have unfilled placeholders                  |
| Scenario authenticity (real products, real numbers) | ✅    | Yoga mat, water bottle, milk frother, kitchen scale — all specific    |

**Key:** ✅ = meets standard | ⚠️ = partial | ❌ = missing or fails

---

## 8. Recommendation

The content quality is high enough that a full rewrite is not needed. The Tier 1 fixes (3 sentences per lesson + one false belief line + one visual callout) would address 80% of the applied-lesson-craft gaps at 10% of the rewrite cost. Start there.

The one exception: the lesson format sameness. If the curriculum ships with the same structure for all 31 lessons, experienced learners will learn to skim. Varying the structure (Tier 2, fix #4) is the most time-intensive change but the highest-return one for learner engagement.
