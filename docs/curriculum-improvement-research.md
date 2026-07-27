# AMPH v2 Curriculum Improvements: Lesson Content, Exercises, Quizzes, and Downloadable Resources

## Overview

This report maps the gaps and improvement opportunities across four dimensions of the AMPH v2 curriculum — lesson content, practical exercises, quizzes, and downloadable resources — grounded in the current state of the platform's 9 modules and 31 lessons, benchmarked against what established competitors deliver, and informed by e-learning design literature.

The core finding is that AMPH v2 teaches the mechanics of Amazon PPC well but leaves a significant gap in the _client-deliverable layer_: the templates, SOPs, reference sheets, and reporting formats that turn a student who understands PPC into a VA who can produce billable work for a real client. That gap sits across every dimension — content, exercises, quizzes, and resources — and closing it is the highest-leverage improvement available.

---

## Content Gaps and Lesson Improvements

### Current State

AMPH v2's curriculum covers 9 modules (0–8) with 31 lessons spanning:

- **Modules 0–4** (foundations tier): onboarding, PPC metrics, keyword research, listing optimization, campaign architecture
- **Modules 5–8** (accelerated-mastery tier): portfolio strategy, bidding lab, search term triage, competitive intelligence

The content is well-structured for its intended audience (Filipino VAs entering Amazon PPC work), uses a consistent pedagogical voice, and has had five factual corrections applied (portfolio mechanics, attribution windows, auction behavior, listing quality signals, dayparting eligibility). The lessons include worked cases, "Your turn" calculation exercises, client-language framing, and quick-check questions at the end of most lessons.

What the curriculum does not yet cover is the client-deliverable and operational layer — the actual output a VA produces for a paying client.

### Missing Topic Areas

**Product launch PPC strategy.** The curriculum teaches bidding, keyword research, and campaign structure as standalone skills but does not cover the specific sequence of decisions a VA makes during a new product launch: when to use aggressive ACoS targets, how to structure a launch campaign versus a steady-state campaign, and how to hand off data to the client at the end of the ramp period. Every competitor course — Jungle Scout Academy, Helium 10 Ads Academy, the Sophie Society masterclass — treats launch strategy as a distinct phase with its own playbook [1].

**Amazon DSP.** Demand-Side Platform advertising (programmatic display and video across Amazon-owned and third-party inventory) is absent from the curriculum. Amazon Ads Academy offers a dedicated DSP certification and a DSP Advanced certification covering audience solutions, bid strategies, pixels, and attribution [2]. As clients grow, they increasingly expect VAs to understand programmatic advertising beyond Sponsored Products. This is a forward-looking gap — not urgent for the current tier-1 student, but a significant value differentiator for the ultimate-transformation tier.

**Client reporting and communication.** The curriculum teaches how to read PPC data but not how to present it to a client. No lesson covers: what a weekly PPC report contains, which metrics to surface versus suppress, how to write a client-facing summary, or how to escalate a campaign problem in professional language. This is the single highest-demand skill among employers hiring Amazon PPC VAs — sellers want someone who can manage the account _and_ communicate results without hand-holding [3].

**SOP creation and delegation documentation.** The curriculum uses the "work loop" (Read → Decide → Change → Explain) as its pedagogical spine but does not teach students how to document that loop for a client. Standard Operating Procedure creation — writing a step-by-step process document for a task — is listed in multiple Amazon VA training outlines as a core competency for anyone managing accounts remotely [4]. It is also the mechanism by which a VA proves their value to a client: "here is exactly how I do this task, so you can verify or delegate it."

**Tools-specific training.** The curriculum references Helium 10 and Jungle Scout in passing but does not include hands-on walkthroughs of specific tool features. Jungle Scout Academy embeds tool tutorials directly alongside the curriculum — each lesson includes a short video showing exactly how to use the relevant feature inside the platform [5]. AMPH v2's simulators partially address this (the four platform engines), but they do not cover the third-party research tools that VAs use on the job.

**Amazon attribution and external traffic.** A growing number of sellers run Google Ads, Facebook Ads, and content marketing funnels alongside their Amazon presence. Amazon's attribution model (AMZN Retail Attribution) lets sellers track off-Amazon traffic back to Amazon conversions. None of the current 9 modules address this, despite it appearing in intermediate PPC curricula and in advanced courses from Helium 10 and seller-focused channels [6].

### What the 10-Block Lesson Format Would Fix

The CURRICULUM-INDEX notes that the formal 10-block lesson production standard — the format used by professional instructional designers for vocational training — has not been applied across all lessons. That standard typically includes: a client-outcome statement at the top, a decision card, a worked case study, a "Your turn" exercise, client-language framing, a knowledge check, a reference summary, and a "What to read next" section.

The current AMPH lessons already include many of these elements, but inconsistently. Some lessons have worked cases; others don't. Some have "Quick check" questions; others have open-ended "Check" questions. Standardizing the 10-block format across all 31 lessons would reduce the cognitive load on students (they always know where to look) and ensure every lesson includes an active-practice component.

---

## Practical Exercises

### The Exercise Gap

AMPH v2 has simulators (Bid Elevator, Campaign Builder, Listing Audit, STR Triage) as end-of-module capstone experiences. These are high-fidelity, scored practice environments. What the curriculum lacks entirely is _in-lesson practice_ — smaller, lower-stakes activities that students complete within or immediately after a lesson to check their understanding before moving on.

E-learning best practice calls for one hands-on activity per module minimum [7]. The argument is straightforward: passive consumption of an entire course without doing anything produces poor retention and low skill transfer. Active application — even a short exercise — significantly improves both.

The distinction matters: simulators test whether a student can operate a complete system; in-lesson exercises test whether they understood the concept the lesson was teaching. A student can pass a lesson without grasping the concept, and a simulator cannot diagnose that gap efficiently.

### Recommended Exercise Types

**Metric calculation drills.** Several current lessons already include "Your turn" calculation problems (e.g., lesson 1.1 asks students to compute CTR, CVR, and ACoS from a worked dataset). The gap is consistency: not every lesson with a quantitative concept includes a calculation exercise. A systematic pass to add at least one calculation exercise per lesson that introduces a formula would close this gap at low production cost — the data already exists in the worked cases.

**Keyword scoring worksheets.** The most common exercise format in competitive Amazon PPC courses is a structured worksheet where students score candidate keywords on relevance, competition, search intent, and estimated conversion rate before adding them to a campaign. A template with scoring criteria and a worked example, paired with a practice dataset, would give students a repeatable workflow they can use on real client accounts [8].

**Scenario decision cards.** Scenario-based learning is one of the most effective formats for vocational training — it places the learner in a realistic situation and asks them to make a decision [9]. A decision card is a short text (3–5 sentences) describing a campaign situation (e.g., "A keyword has 200 clicks, $150 spend, and $0 in sales. What's your next action?") with three possible responses, only one of which is correct. Decision cards can be embedded in lessons as knowledge checks or used as standalone exercises. They require minimal production cost and map directly to the work-loop framework the curriculum already teaches.

**Search term triage practice.** The current STR Triage simulator is sophisticated (it has ground-truth classifications and scoring dimensions). The gap is preparation: students who enter the simulator without having practiced the triage decision tree in a lower-stakes format perform worse and take longer. A short triage exercise — a table of search terms with spend, clicks, and orders, asking students to categorize each — would bridge the gap between the lesson content and the simulator.

**Negative keyword bank building.** Keyword lessons teach the concept of negative keywords; the simulator tests triage decisions. The exercise that bridges them — taking a sample search term report and building a negative keyword list — is absent from the curriculum. A structured worksheet with an example report and a template for documenting negatives (exact vs. phrase, reason for exclusion, date added) would be directly usable on client accounts.

### What Simulators Cannot Replace

The four simulators are strong capstone experiences but they are not a substitute for in-lesson exercises. A student who scores 90% on the Campaign Builder simulator may have memorized simulator patterns rather than understood campaign architecture principles. In-lesson exercises with randomized data and immediate feedback catch this gap earlier and at lower cost to fix.

---

## Quiz Improvements

### Current State

AMPH v2's quiz system has one quiz per module (7 quizzes total), all multiple-choice, 70% pass threshold, 100 XP reward per pass, with explanations provided after each answer. The quiz questions are well-written — they test application rather than recall, include realistic numbers, and the explanations are substantive.

The limitations are structural, not quality-related.

### Structural Gaps

**No pre-course diagnostic.** The Onboarding module's knowledge check (Module 0) asks students basic PPC questions after they've already read the onboarding content — it is a formative assessment, not a diagnostic. A true diagnostic quiz fires _before_ any lesson content, establishes baseline knowledge, and either skips students who already know the material or flags areas they need to focus on. Jungle Scout Academy includes a pre-assessment that routes students through the curriculum based on their existing knowledge [5]. AMPH v2 has no equivalent: a student with three months of PPC experience and a complete beginner start in the same place.

**No mid-lesson knowledge checks.** Every lesson ends with a "Check" or "Quick check" section in some form, but these are not tracked, rewarded, or systematically included across all 31 lessons. Best-practice e-learning embeds short knowledge checks (1–5 questions) _during_ lessons, not just at the end of modules [7]. These checks serve two functions: they confirm understanding before the student moves on, and they surface confusion while the relevant material is still fresh.

**All questions are multiple-choice.** MCQs are the right format for many knowledge checks, but they are not sufficient for testing all learning objectives. Scenario-based questions — where the student reads a short situation and selects a response — are more effective at testing applied judgment than pure MCQs. Fill-in-the-blank questions for formula recall, and "select all that apply" questions for topics like negative keyword strategy, would add variety and better map to different cognitive levels.

**One quiz per module, no retake routing.** A student who fails the Module 1 quiz and retries without reviewing gets the same result. There is no mechanism to route a failed student back to specific lesson content, or to require completion of targeted review exercises before a retake. Amazon Ads Academy's certification model provides a detailed assessment summary after a failed attempt, telling students exactly which topics to revisit [2].

**No quiz analytics.** The CURRICULUM-INDEX notes that no learner analytics pipeline has been documented. Quiz performance data — which questions have low pass rates, which modules correlate with repeated failures, which question types are most frequently missed — would be the most direct signal for curriculum improvement. Competitors including Jungle Scout Academy track lesson engagement patterns and use them to improve content [5].

### Recommended Quiz Improvements

The highest-leverage change is adding a pre-course diagnostic quiz at Module 0 that fires before lesson content and establishes a baseline. This is a single quiz, low production cost, and immediately actionable. It serves both as a learner self-assessment and as a data source for understanding student starting points.

The second priority is standardizing mid-lesson knowledge checks across all 31 lessons — one to three questions per lesson, auto-graded, with immediate feedback, tracking completion but not gating progression. This converts every lesson from a passive read into an active checkpoint.

The third priority is diversifying question types: adding scenario-based questions to existing quizzes (replacing some MCQs or added alongside), and introducing a "calculation" question type where students compute a metric and enter the numeric answer.

---

## Downloadable Resources

### The Greenfield Opportunity

AMPH v2 currently has no downloadable resources. This is the dimension with the most white space and the clearest ROI for student outcomes. Every competitive course — from free platforms like Amazon Ads Academy to paid tools like Jungle Scout and Helium 10 — includes downloadable content as a core value proposition.

For a _vocational_ course whose goal is producing employable VAs, downloadables are not a nice-to-have. They are the bridge between "I know PPC" and "I can do PPC work for a client." The documents a VA produces on the job — reports, checklists, SOPs, keyword lists — are exactly the kind of resource that, if taught and provided as templates during training, immediately raises student confidence and employer value.

### Priority Downloadable Resources by Curriculum Area

**Keyword research.** A keyword scoring worksheet is the most universally applicable resource across all levels. It should include columns for keyword, search intent classification, relevance score (1–5), estimated competition, estimated CVR, and notes — paired with a worked example and a blank template [8]. This directly maps to Module 2 content and is usable on the first real client engagement.

**Campaign setup.** A campaign architecture checklist — structured as a numbered list of pre-flight checks before launching any campaign — covers campaign naming convention, negative keywords pre-loaded, budget allocation by match type, bid strategy selected, targeting confirmed, and objective documented. Helium 10's Ads Academy walkthroughs include a pre-launch checklist as a reference document [10]. An equivalent for AMPH v2 would fit naturally after Module 4.

**Search term triage.** A triage decision tree (flowchart or checklist) that walks a VA through: sort by spend → identify zero-conversion terms → apply negative → identify converting terms → graduate to exact campaign → recalculate ACoS. This builds directly on Module 7 content and is the highest-frequency task a PPC VA performs weekly.

**Weekly reporting.** A weekly PPC report template — structured as a Google Sheets or spreadsheet with columns for campaign name, spend, sales, orders, ACoS, CPC, CTR, and week-over-week change — is the document a VA sends to a client every Monday. It is the single most concrete proof of value a VA provides. No current lesson teaches the format of this document, and no template exists. This is the highest-priority downloadable for client-deliverable readiness.

**Negative keyword bank.** A structured negative keyword log with columns for keyword, match type, reason for exclusion, date added, campaign it was found in, and who approved the addition. VAs working with multiple clients build these over time; having a template at the start accelerates their workflow and enforces consistency.

**ACoS and bid calculator.** A simple spreadsheet that computes maximum CPC from price, target ACoS, and CVR — with worked examples for launch mode, profit mode, and defense mode — would directly reinforce Module 6 content. This is low production cost (a spreadsheet with three input cells and one formula) and directly usable in the Bid Elevator simulator context.

**SOP template for PPC account onboarding.** A blank SOP template that a VA fills out when taking over a new client account: account structure, current campaigns, ACoS targets, client contact, escalation protocol, reporting cadence. This directly teaches the SOP creation skill that the curriculum does not currently cover and is the document most employers ask VAs to produce during onboarding.

### Format Considerations

Downloadables should be provided as Google Sheets templates (for spreadsheets) and PDF checklists (for reference documents). Google Sheets templates allow students to copy and use them immediately; PDFs serve as printer-friendly reference cards. Helium 10 provides both formats — a downloadable PDF checklist alongside a walkthrough video [10]. Amazon Ads Academy provides downloadable PDFs for certification study guides [2].

The production cost for most of these resources is low relative to their impact. They require subject-matter expertise (to define the right columns and fields) and a designer (to format them to brand standards), not a full lesson production cycle.

---

## Format and Delivery Medium

### Text-Only Is Sufficient for Theory, Insufficient for Procedure

The current AMPH v2 curriculum is entirely text-based (MDX files). This is an efficient production model — text is fast to write, easy to update, and accessible across devices — and for teaching concepts and frameworks, it is as effective as video.

The research is clear on one point: for teaching _practical procedures_ — how to use a tool, how to complete a workflow — video is measurably superior to text in controlled studies. Vocational learners who watched procedural videos performed significantly better on practical examinations than those who read illustrated text [11]. A study comparing video and PDF tutorials for software procedure training found video produced higher factual and procedural knowledge scores, with higher learner satisfaction [12].

This has a direct implication for AMPH v2. The theory lessons (why ACoS matters, how match types differ, when to use broad vs. exact) are well-suited to text. The _how-to_ content — how to use Helium 10 Cerebro, how to export a search term report, how to build a campaign in Seller Central — would benefit from video walkthroughs.

### A Pragmatic Path

Video production is expensive and slow relative to text. A realistic improvement path does not require replacing all text content with video. The practical approach, used by Jungle Scout Academy and Helium 10, is to add video _alongside_ text for specifically procedural lessons: a 3–5 minute screencast walkthrough of a tool or workflow, with the transcript and step-by-step instructions available as text. This serves visual learners, provides the procedural memory encoding that video uniquely offers, and leaves the text as the authoritative reference.

The lessons most in need of video supplementation are those that map to simulator prep (4.4 Campaign Architecture Practice, 6.3 Bid Elevator Prep, 7.3 STR Triage Prep) and the tools-specific content that doesn't yet exist in the curriculum.

For now, the highest-leverage content investment remains the client-deliverable layer — the SOPs, checklists, and templates described above — which can be produced as text documents without requiring video production infrastructure.

---

## Priority Summary

Not all improvements carry equal weight. Ranked by impact and production cost:

**Tier 1 — Highest impact, lowest cost**

1. **Pre-course diagnostic quiz** (Module 0, fires before lesson content). One quiz, directly actionable from existing quiz infrastructure.
2. **Mid-lesson knowledge checks** (standardized across all 31 lessons). Low production cost, high effect on completion and retention.
3. **Downloadable resources** — keyword scoring worksheet, weekly PPC report template, search term triage checklist. Teach the skill and provide the template. Directly raises student readiness for real client work.
4. **Calculation exercises** in every lesson that introduces a formula. The worked data already exists in most lessons; adding a practice problem with answers is a content pass, not a new build.

**Tier 2 — High impact, moderate cost**

5. **10-block lesson format standardization.** Systematic pass to ensure every lesson has: outcome statement, worked case, practice exercise, client-language framing, and knowledge check. Reduces student cognitive load and ensures consistent practice opportunities.
6. **Client reporting lesson** (new lesson, Module 5 or post-Module 8). The curriculum teaches data analysis but not data presentation. A single lesson on weekly reporting format, client communication, and escalation language closes the highest-demand employer gap.
7. **SOP creation lesson** (new lesson). Standard Operating Procedure writing is a teachable skill with a clear format. Paired with an SOP template downloadable, it gives students a deliverable they can show a potential employer.

**Tier 3 — High impact, higher cost**

8. **Video walkthroughs for procedural lessons.** 3–5 minute screencasts for Campaign Builder prep, Bid Elevator prep, and tools-specific content. Do not replace text; add alongside.
9. **Amazon DSP module** (new Module 9 or expansion of Module 8). Demand-Side Platform is a growth area for advanced VAs. Requires subject-matter expert input to author accurately.
10. **Quiz analytics pipeline.** Collect and analyze quiz performance data per question and per module. Directly informs which content gaps to close first.

---

## References

[1] Sophie Society, _Amazon PPC Full Course 2026_, YouTube. https://www.youtube.com/watch?v=-3LbXP57BVs

[2] Amazon Ads Academy, Certifications. https://advertising.amazon.com/academy/certifications

[3] VA Masters, Hire an Amazon PPC Virtual Assistant. https://vamasters.com/hire-expert-amazon-ppc-virtual-assistants-va-masters/

[4] Computer Educator Pakistan, Amazon Virtual Assistant Training Course Outline PDF. https://www.computereducator.pk/wp-content/uploads/2025/08/Amazon-Virtual-Assistant-Training-Course-Outline-PDF-In-English-Urdu.pdf

[5] Project FBA, Jungle Scout Academy Review. https://projectfba.com/jungle-scout-academy-review/

[6] Mina Elias / Trivium Group, _2026 Amazon PPC Full Course_, YouTube. https://www.youtube.com/watch?v=qeFKoHeiRPE

[7] ProProfs Training, 5 Tips for Designing Effective Online Courses in 2026. https://www.proprofstraining.com/blog/designing-effective-online-course/

[8] Simple Life Calc, Amazon PPC Budget Worksheet. https://simplelifecalc.com/__l5e/assets-v1/10ee7c88-aaff-4023-9c11-6257221ec724/amazon-ppc-budget-worksheet.pdf

[9] eLearning Industry, 7 Examples of Scenario-Based Learning for Training. https://elearningindustry.com/scenario-based-learning-sbl-formal-informal-learning-7-examples

[10] Helium 10, Ads Academy. https://www.helium10.com/ads-academy/amazon-ppc-course/

[11] PMC/NIH, Video- or text-based e-learning when teaching clinical procedures. https://pmc.ncbi.nlm.nih.gov/articles/PMC4140394/

[12] Eric Ed.gov, The Comparative Instructional Effectiveness of Print-Based and Video-Based Instructional Materials. https://eric.ed.gov/?id=EJ881580
