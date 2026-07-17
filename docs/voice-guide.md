# Voice Guide — Project Amazon PH Academy v2

**Audience:** Filipino virtual assistants learning Amazon advertising
**Tone:** Direct, plain-spoken, no-BS
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)

---

## The Voice

Project Amazon PH Academy talks like a senior PPC specialist who's been doing this for 10 years and has zero patience for jargon, fluff, or hedging. It's warm because the audience is learning a hard skill under pressure, but it's never condescending and never oversells.

If a Pinoy VA in Cebu reads this on their phone at 11pm after a 9-hour VA shift, they should feel like the platform respects their time.

## Voice in Three Sentences

1. **Say what it does, not what it represents.** "Save your campaign" not "Persist your campaign structure to the database."
2. **Use real numbers, not abstractions.** "₱2,999 one-time, unlock everything for life" not "Affordable tier-based access."
3. **Talk to the reader, not about them.** "You'll see this every week" not "Users may encounter this scenario."

## Banned Phrases (enforced by ESLint)

These never ship. Anywhere. UI copy, lessons, error messages, marketing pages.

### The Obvious Ones

- "leverage" → use "use"
- "delve into" → use "look at" or "dive into"
- "navigate the complexities of" → delete the phrase, write what you mean
- "in today's fast-paced world" → delete
- "in the realm of" → delete
- "in the world of" → delete
- "dive deep" → "look at" or "go through"
- "unlock the power of" → "use"
- "harness the potential of" → "use"
- "robust" → describe what it actually does
- "seamless" → describe the actual experience
- "cutting-edge" → describe what's new
- "revolutionary" → describe the change
- "game-changing" → describe the change
- "next-generation" → describe the version
- "world-class" → name the actual quality
- "best-in-class" → name the comparison
- "elevate your" → "improve your"
- "supercharge your" → describe what gets faster
- "turbocharge" → describe what gets faster
- "in conclusion" → just stop
- "it's important to note that" → delete
- "it's worth mentioning that" → delete
- "needless to say" → delete
- "at the end of the day" → delete
- "when it comes to" → delete
- "in terms of" → "for" or rewrite
- "a wide range of" → "many" or list them
- "a variety of" → list them
- "plethora of" → "many" or list them
- "myriad of" → "many" or list them
- "multitude of" → "many" or list them
- "in order to" → "to"
- "due to the fact that" → "because"
- "at this point in time" → "now"
- "a number of" → "some" or a number
- "the majority of" → "most"
- "subsequently" → "then" or "after"
- "prior to" → "before"
- "in the event that" → "if"
- "with regard to" → "about" or "for"
- "in spite of the fact that" → "although"
- "despite the fact that" → "although"
- "on the basis of" → "from" or "by"
- "in light of the fact that" → "because"
- "for the purpose of" → "to" or "for"
- "in the process of" → "while"
- "is able to" → "can"
- "has the ability to" → "can"
- "it is essential to" → "must" or rewrite
- "it is necessary to" → "must" or rewrite
- "it should be noted" → delete
- "please note that" → delete
- "kindly" → delete (or "please" if you really need to)
- "utilize" → "use"
- "facilitate" → "help" or rewrite
- "endeavor" → "try"
- "commence" → "start" or "begin"
- "terminate" → "end" or "stop"
- "endeavor to" → "try to"
- "remit" → "send" or "pay"
- "ascertain" → "find out"
- "elucidate" → "explain"
- "expedite" → "speed up"

### Compound Slop

- "take your <X> to the next level" → describe the actual change
- "the <X> you didn't know you needed" → say what it does
- "everything you need to know about <X>" → list what they need
- "a comprehensive guide to <X>" → name the scope
- "the ultimate guide to <X>" → name the scope
- "the definitive guide to <X>" → name the scope
- "mastering <X>: a complete guide" → delete "mastering" and "complete"
- "from zero to hero" → describe the journey
- "in 5 easy steps" → list the steps
- "like a pro" → describe the skill
- "for beginners and experts alike" → pick an audience
- "whether you're a <X> or a <Y>" → pick a reader
- "stop <X>. start <Y>." (as a feature pitch) → describe the change in plain words
- "we've got you covered" → describe the actual coverage
- "look no further" → delete
- "you're in the right place" → delete
- "let's dive in" → "let's start" or just start
- "without further ado" → delete
- "are you ready to <X>?" → delete (or "ready?")
- "the future of <X>" → describe what's actually new

### Marketing-ese That Infects Lesson Copy

- "this is where the magic happens" → describe the outcome
- "the secret to <X>" → name the actual thing
- "the truth about <X>" → state the fact
- "what nobody tells you about <X>" → state the thing
- "the <X> cheat code" → describe the shortcut
- "the <X> hack" → describe the shortcut
- "pro tip" → just give the tip
- "insider secret" → just give the fact
- "industry secret" → just give the fact
- "what the pros know" → just give the fact

## Sentence-Level Rules

1. **Active voice.** "You save the campaign" not "The campaign is saved."
2. **Short sentences.** Average 12–18 words. If a sentence hits 30, split it.
3. **One idea per sentence.** Don't stack clauses with semicolons.
4. **Front-load the verb.** Subject, verb, object. Then add the modifiers after.
5. **No em-dashes.** Use periods, commas, parentheses. (Yes, including in this doc; the doc violates itself here and we accept the inconsistency for clarity.)
6. **No emojis in body copy.** One in a CTA button is fine. Two in a paragraph is too many.
7. **No exclamation points except in CTAs.** "Get started." not "Get started today!" except on the button itself.
8. **No questions to the reader used as filler.** "Want to learn more?" is filler. "Ready to start?" is a real question.
9. **Concrete over abstract.** "Save ₱2,500" not "save money." "30 minutes" not "a short time."
10. **Filipino context, not Filipino language.** Use real city names, real peso amounts, real VA scenarios. Don't translate the UI to Tagalog (yet).

## Filipino Context, Properly Used

Good:
- "If you're a VA in Cebu charging ₱20k/month, the Foundations course pays for itself in your first PPC client."
- "We have students who went from zero Amazon knowledge to managing ₱500k/month in ad spend in eight weeks."
- "Pagkatapos ng module na 'to, alam mo na kung paano basahin ang isang search term report." (acceptable code-switch in lessons, not in UI chrome)

Bad:
- Tagalog translations of the UI chrome ("Tahanan", "Mga Kurso", "Aking Account"). The UI is English.
- "Mabuhay!" in CTAs. The audience is online all day; they don't need a greeting.
- Stereotypes ("sipag at tyaga", "diskarte"). The audience is skilled professionals, not characters.

## The One Test

Read the sentence out loud. If it sounds like a LinkedIn post, a SaaS landing page, or a press release, rewrite it. If it sounds like a senior PPC specialist talking to a junior PPC specialist, ship it.

## When You're Stuck

- Cut the sentence in half. The second half is usually the point.
- Replace the noun with the verb. "Provide assistance" → "help."
- Replace the abstract with the concrete. "Optimize your workflow" → "Save 30 minutes a day."
- Replace the marketing with the math. "Unlock your potential" → "₱60k–₱80k/month."
- Read the AGENTS.md voice test. The ESLint rule catches the most common ones. The full list is here for review.
