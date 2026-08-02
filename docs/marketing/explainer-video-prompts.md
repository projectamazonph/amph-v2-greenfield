# Explainer Video Prompts (NotebookLM Video Overviews, ~60 sec)

43 prompts: 3 pricing tiers, 9 curriculum modules, 31 individual lessons. Written for NotebookLM's **Video Overview → Customize** instruction box, not a shot-by-shot AI-video (Sora/Veo) prompt: NotebookLM writes and narrates the video itself from whatever sources you've added to the notebook; your job is to tell it the angle, structure, and tone.

## How to use each entry

1. Open (or create) a notebook and add the **Source** listed under the entry (the actual MDX file, or the doc named): NotebookLM pulls facts and numbers from what's in the notebook, so add exactly that source, not the whole repo.
2. Open **Video Overview → Customize**.
3. Paste the **Prompt** block verbatim into the instruction field.
4. Pick the shortest/brief length option if the picker offers one. NotebookLM doesn't accept a hard runtime, but keeping the instruction itself scoped to ~150 words of narration (the amount of ground a 60-second voiceover can cover at conversational pace) keeps the output close to 60 seconds. If it overshoots, regenerate once: it's not deterministic.
5. If the style/theme picker offers a custom look, use the **Visual note** below: it's not literal art direction, just steer the picker toward the closest preset.

## Shared brief (already baked into every prompt below: don't re-paste)

- **Audience:** Filipino virtual assistants, 22–40, currently earning ₱15k–30k/month, upskilling into Amazon PPC to charge ₱60k–80k/month.
- **Voice:** a senior PPC specialist talking to a junior one. Direct, plain-spoken, real ₱ numbers and real percentages, not abstractions. No hype words ("unlock," "seamless," "next-level," "revolutionize," "game-changing"). No filler questions to camera. Active voice, short sentences.
- **Visual note:** warm off-white background, near-black text, one orange accent used sparingly: not neon, not gradient, not a glossy generic-SaaS look.

**A note on scope:** the "core 5 modules" vs. "8 advanced modules" split in the pricing table (`docs/product-brief.md`) isn't mapped to specific module numbers anywhere in the codebase, so the module prompts below are written as standalone overviews of that module's content: they don't claim a specific tier. The tier prompts stand on their own, built straight from the pricing table.

---

## Part 1: Tier videos (3)

### Tier 1: PPC Foundations (₱2,999)

**Source:** `docs/product-brief.md` (Pricing Tiers table) + `docs/business-layer.md`

**Prompt:**
Make a 60-second video overview selling the "PPC Foundations" course tier, ₱2,999 one-time payment, no subscription. Structure: (1) 0–10s: open with the actual outcome, not a hook question: a VA earning ₱15k–30k/month can start charging clients for Amazon ads after this. (2) 10–40s: state exactly what ₱2,999 buys: 5 core modules, 3 practice tools (Campaign Builder, Bid Elevator, STR Triage), graded quizzes, XP and badges, community access. Say it's one-time, not a subscription. (3) 40–60s: close with the concrete next step: enroll once, keep access for life, no recurring charge. Tone: direct, plain-spoken, real peso numbers, no hype words, no filler questions. Do not claim outcomes the tier doesn't include (no live classes, no 1-on-1 review, both higher-tier features).

---

### Tier 2: Accelerated Mastery (₱5,999)

**Source:** `docs/product-brief.md` (Pricing Tiers table) + `docs/business-layer.md`

**Prompt:**
Make a 60-second video overview selling the "Accelerated Mastery" course tier, ₱5,999 one-time payment. Structure: (1) 0–10s: state who upgrades: a VA who finished the basics and wants to run full accounts, not just single campaigns. (2) 10–40s: list exactly what's added on top of Foundations: advanced modules (8 total), all 5 scenario packs (kitchen, electronics, garden, fitness, beauty) across every simulator, downloadable resources, recorded live classes. Be specific that this is "everything in Foundations, plus," not a separate course. (3) 40–60s: close with the concrete next step: one-time ₱5,999, upgrade any time. Tone: direct, plain-spoken, real peso numbers, no hype words, no filler questions.

---

### Tier 3: Ultimate Transformation (₱9,999)

**Source:** `docs/product-brief.md` (Pricing Tiers table) + `docs/business-layer.md`

**Prompt:**
Make a 60-second video overview selling the "Ultimate Transformation" course tier, ₱9,999 one-time payment, the top tier. Structure: (1) 0–10s: state who this is for: a VA ready to work directly with Ryan, not just self-study. (2) 10–40s: list exactly what's added on top of Mastery: weekly live classes with Ryan, one 1-on-1 portfolio review per month, a private community channel, and priority review on certificate applications. (3) 40–60s: close with the concrete outcome this tier is built for: landing and keeping a ₱60k–80k/month Amazon ads client, with Ryan checking your work directly. Tone: direct, plain-spoken, real peso numbers, no hype words, no filler questions, no overpromising ("guaranteed," "instant results").

---

## Part 2: Module videos (9)

### Module 0: Onboarding (3 lessons: Welcome, Platform Tour, Account Safety & Client Brief)

**Source:** `content/curriculum/modules/0-onboarding/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Onboarding module for new students. Structure: (1) 0–10s: state what this module is for: getting oriented before touching real client data, not a sales pitch. (2) 10–45s: cover the three lessons in order: what an Amazon PPC VA actually does day-to-day and the three course tiers ahead; a tour of the platform's five practice tools and when each one unlocks; and why you confirm facts with a client-brief checklist before changing anything in a live ad account. (3) 45–60s: close with the concrete first action: finish these three lessons, then start Module 1 on reading PPC metrics. Tone: direct, plain-spoken, no hype, treats the viewer as a professional starting a new skill, not a beginner to be coddled.

---

### Module 1: Foundations (5 lessons: Big Six metrics, CPC/CTR, ACoS/TACoS/profitability, ROAS, metrics in practice)

**Source:** `content/curriculum/modules/1-foundations/` (all 5 MDX files)

**Prompt:**
Make a 60-second video overview of the Foundations module. Structure: (1) 0–10s: open with the actual rule this module teaches: don't change a bid because one metric looks bad; find out first whether the problem is traffic, conversion, cost, budget, or the campaign's own objective. (2) 10–45s: name the Big Six metrics this module covers (CPC, CTR, CVR, ACoS, TACoS, ROAS) and state in one line each what decision each one answers (is the ad worth clicking, is the listing converting, is the campaign profitable, what's the real return). Use one concrete numeric example (e.g., a ₱40 coffee grinder, 20,000 impressions, 160 clicks, ₱192 spend). (3) 45–60s: close with what the learner can now do: read a campaign's numbers as one story instead of five separate stats, and set a defensible bid ceiling. Tone: direct, plain-spoken, real numbers, no jargon left unexplained.

---

### Module 2: Keyword Research (4 lessons: match types, workflow, negative keywords, keyword grouping)

**Source:** `content/curriculum/modules/2-keyword-research/` (all 4 MDX files)

**Prompt:**
Make a 60-second video overview of the Keyword Research module, which feeds directly into the platform's Keyword Research practice simulator. Structure: (1) 0–10s: open with the real question this module answers: which keywords should you actually bid on, and how do you organize them so a campaign doesn't waste money. (2) 10–45s: cover, in order, the three match types (broad, phrase, exact) and what role each plays; the four-step research workflow (research, analyze, prioritize, organize) that produces a keyword map; how to read a search term report and decide when to block a term with a negative exact or negative phrase; and how to group keywords into ad groups by shared shopper intent. (3) 45–60s: close with the concrete deliverable: a keyword map ready to load straight into a real campaign structure. Tone: direct, plain-spoken, no hype.

---

### Module 3: Listing Optimization (3 lessons: listing/ad relevance signals, listing anatomy, A+ Content & Brand Registry)

**Source:** `content/curriculum/modules/3-listing-optimization/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Listing Optimization module. Structure: (1) 0–10s: open with the diagnostic question this module trains: when a campaign underperforms, is it a weak bid or a weak listing, and how do you tell the difference using CTR and CVR. (2) 10–45s: cover, in order, reading listing and ad relevance signals to isolate the real problem; rewriting a listing's title, bullets, and image sequence with PPC-aware formulas so every section pulls its weight for CTR and CVR; and when Brand Registry and A+ Content are worth recommending to a client, with a rough ACoS-improvement estimate. (3) 45–60s: close with what the learner can now do: tell a client, with numbers, whether to fix the ad or fix the listing first. Tone: direct, plain-spoken, real numbers, no hype.

---

### Module 4: Campaign Architecture (4 lessons: Sponsored Products, Sponsored Brands & Display, campaign structure, hands-on practice)

**Source:** `content/curriculum/modules/4-campaign-architecture/` (all 4 MDX files)

**Prompt:**
Make a 60-second video overview of the Campaign Architecture module, which ends with the learner using the platform's Campaign Builder practice simulator. Structure: (1) 0–10s: open with the real task: building a campaign structure a client (or a future you) can understand at a glance, not guessing at setup. (2) 10–45s: cover, in order, setting up a basic Sponsored Products structure with the right match-type budget split; choosing between Sponsored Products, Sponsored Brands, and Sponsored Display based on the client's actual goal instead of defaulting to one; and the "filing cabinet" naming-convention method for structure that makes every campaign's purpose obvious. (3) 45–60s: close with the concrete payoff: walking into the Campaign Builder tool with a written plan for structure, keywords, bids, budget, and negatives, before placing a single keyword. Tone: direct, plain-spoken, no hype.

---

### Module 5: Portfolio Strategy (3 lessons: campaign portfolios, budget pacing, seasonal strategy)

**Source:** `content/curriculum/modules/5-portfolio-strategy/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Portfolio Strategy module. Structure: (1) 0–10s: open with the real trigger: this module is for the moment an account has grown past managing campaigns one at a time. (2) 10–45s: cover, in order, organizing campaigns into portfolios with their own budget-allocation logic without mixing up portfolio-level budget with campaign-level bids; reading a campaign's burn rate mid-day to decide whether to raise budget, adjust bids, or leave it alone; and building a pre-season, in-season, and post-season plan for an Amazon shopping event, defending a rising ACoS with profit-after-ad-spend instead of the ratio alone. (3) 45–60s: close with what the learner can now do: manage a multi-campaign account at scale instead of firefighting one campaign at a time. Tone: direct, plain-spoken, real numbers, no hype.

---

### Module 6: Bidding Lab (3 lessons: bid strategies, placement adjustments, Bid Elevator prep)

**Source:** `content/curriculum/modules/6-bidding-lab/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Bidding Lab module, which ends with the learner ready for the platform's Bid Elevator practice simulator. Structure: (1) 0–10s: open with the real decision: which bid strategy fits a specific campaign's data maturity and margin, not a one-size-fits-all default. (2) 10–45s: cover, in order, choosing between Fixed Bids, Dynamic Up and Down, and Dynamic Down Only based on what each one actually does (not a guarantee it doesn't make); calculating the true maximum effective CPC once a placement adjustment stacks on top of a dynamic bid strategy; and pulling price, CVR, and target ACoS from a scenario brief to calculate max CPC and decide to bid, accept a different ACoS, or walk away. (3) 45–60s: close with the concrete payoff: walking into Bid Elevator with a calculated bid ceiling, not a guess. Tone: direct, plain-spoken, real numbers, no hype, no guarantees the strategies themselves don't make.

---

### Module 7: Search Term Triage (3 lessons: search term analysis, negative keywords, STR Triage prep)

**Source:** `content/curriculum/modules/7-search-term-triage/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Search Term Triage module, which ends with the learner ready for the platform's STR Triage practice simulator. Structure: (1) 0–10s: open with the real task: sorting a search term report by data (CTR, CVR, ACoS), not gut feel. (2) 10–45s: cover, in order, sorting every search term into one of five categories (harvest, monitor, negate, judge, investigate); building a negative keyword list straight from that report, choosing negative exact or negative phrase per term, and telling wasted spend apart from spend that just needs a lower bid; and triaging a full batch of terms at speed using a five-option decision flowchart (Keep, Harvest to Exact, Decrease Bid, Add Negative Keyword, Increase Bid). (3) 45–60s: close with the concrete payoff: clearing a search term report fast, with a reason for every call. Tone: direct, plain-spoken, no hype.

---

### Module 8: Competitive Intelligence (3 lessons: Brand Analytics, Share of Voice, competitor benchmarking)

**Source:** `content/curriculum/modules/8-competitive-intelligence/` (all 3 MDX files)

**Prompt:**
Make a 60-second video overview of the Competitive Intelligence module. Structure: (1) 0–10s: open with the real question: what is a competitor doing that you can actually see in Amazon's own data, and what do you do about it. (2) 10–45s: cover, in order, pulling Amazon Brand Analytics' Top Search Terms and Market Basket Analysis reports and turning them into new keyword and product-targeting additions; building a Share of Voice estimate for a keyword or category, classifying the seller as Contender, Established, or Dominant, and matching a bidding strategy to that position; and running a weekly competitive review that scores competitors on a gap-analysis matrix and turns each gap into one trackable campaign action. (3) 45–60s: close with the concrete payoff: a repeatable weekly routine for staying ahead of specific competitors, not vague "competitive awareness." Tone: direct, plain-spoken, no hype.

---

## Part 3: Lesson videos (31)

### Module 0: Onboarding

**0.1: Welcome. Your Path to Amazon PPC Work**
Source: `content/curriculum/modules/0-onboarding/0.1-welcome.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with what an Amazon PPC virtual assistant actually does day-to-day, no abstractions. 10–45s: name the three course tiers ahead (Foundations, Mastery, Ultimate) and the repeating work loop the learner will use in every lesson and tool from here on. 45–60s: close with the concrete next step: Platform Tour, lesson 0.2. Tone: direct, plain-spoken, no hype, talks to the learner like a colleague on day one, not a beginner.

**0.2: Platform Tour and Navigation**
Source: `content/curriculum/modules/0-onboarding/0.2-platform-tour.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real goal: knowing where everything lives before you need it under pressure. 10–45s: name the five practice tools (Campaign Builder, Bid Elevator, STR Triage, Listing Audit, Keyword Research) and when each one unlocks, plus what a real Amazon Ads Console session will eventually look like. 45–60s: close with the concrete next step: the account-safety lesson before any live-data work. Tone: direct, plain-spoken, no hype.

**0.3: Account Safety and the Client Brief**
Source: `content/curriculum/modules/0-onboarding/0.3-first-simulation.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real stakes: a live client account, not a sandbox, so confirming facts before changing anything is the job, not a formality. 10–45s: walk through why you confirm facts before touching a live account, then how to fill out a client-brief intake checklist from a real conversation. 45–60s: close with the concrete next step: Module 1, reading PPC metrics before acting on them. Tone: direct, plain-spoken, no hype, treats account safety as a professional habit, not a scare tactic.

### Module 1: Foundations

**1.1: Read PPC Data Before You Change PPC Data**
Source: `content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the rule: don't change a bid because one metric looks bad. 10–45s: name the Big Six metrics (CPC, CTR, CVR, ACoS, TACoS, ROAS) read together, and walk the ₱40 coffee-grinder example (20,000 impressions, 160 clicks, ₱192 spend) to show how to spot whether the real problem is traffic, conversion, cost, budget, or the campaign's objective. 45–60s: close with what the learner can now do: pick the first question to investigate before touching anything. Tone: direct, plain-spoken, real numbers, no hype.

**1.2: Is My Ad Worth Clicking? CPC and CTR**
Source: `content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real question: is a high CPC actually a problem, or is it affordable given the numbers. 10–45s: explain what drives CPC and CTR up or down, then walk through calculating the maximum CPC a target ACoS can support. 45–60s: close with what the learner can now do: judge a CPC against a real ceiling instead of a gut feeling. Tone: direct, plain-spoken, real numbers, no hype.

**1.3: Am I Making Money or Losing Money? ACoS, TACoS, and Profitability**
Source: `content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real fear this answers: a scary-looking ACoS on a new campaign doesn't automatically mean it's losing money. 10–45s: walk through calculating break-even ACoS for a product, then reading TACoS alongside it to see the full sales picture, including organic sales. 45–60s: close with what the learner can now do: explain to a client why a launch campaign's high ACoS isn't automatically a problem. Tone: direct, plain-spoken, real numbers, no hype.

**1.4: Every Dollar In, How Many Dollars Back? ROAS**
Source: `content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real question: ROAS and ACoS say the same thing two different ways, so when does each framing actually help. 10–45s: walk through calculating ROAS and converting between ROAS and ACoS with a real example. 45–60s: close with what the learner can now do: pick whichever framing makes the number clearer for the person they're talking to. Tone: direct, plain-spoken, real numbers, no hype.

**1.5: Reading the Story Your Metrics Tell**
Source: `content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real shift this lesson makes: reading the Big Six metrics together as one pattern, not checking them one at a time. 10–45s: walk through a case where the pattern across metrics reveals the real problem, and apply the maximum-CPC formula from earlier lessons to set a defensible bid ceiling. 45–60s: close with what the learner can now do: read a full metrics dashboard in one pass and know where to look first. Tone: direct, plain-spoken, real numbers, no hype.

### Module 2: Keyword Research

**2.1: Match Types: Broad, Phrase, Exact**
Source: `content/curriculum/modules/2-keyword-research/2.1-match-types.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real decision: the same keyword behaves differently depending on match type, and picking wrong wastes budget. 10–45s: walk through what broad, phrase, and exact match each actually do, and which role each one plays in a campaign. 45–60s: close with what the learner can now do: pick the right match type for a keyword's job and explain that choice to a client in plain terms. Tone: direct, plain-spoken, no hype.

**2.2: Keyword Research Workflow & Tools**
Source: `content/curriculum/modules/2-keyword-research/2.2-keyword-research-workflow.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real problem: a pile of keyword ideas isn't a campaign plan. 10–45s: walk through the four-step workflow (research, analyze, prioritize, organize) end to end for a real product. 45–60s: close with the concrete deliverable: a keyword map ready to feed straight into campaign structure. Tone: direct, plain-spoken, no hype.

**2.3: Negative Keywords: The Profit Lever**
Source: `content/curriculum/modules/2-keyword-research/2.3-negative-keywords.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real cost: wasted ad spend hiding in plain sight on a search term report. 10–45s: walk through spotting wasted spend and deciding between a negative exact and a negative phrase, at the campaign or ad group level. 45–60s: close with what the learner can now do: cut wasted spend from a real search term report. Tone: direct, plain-spoken, real numbers, no hype.

**2.4: Keyword Grouping for Campaign Structure**
Source: `content/curriculum/modules/2-keyword-research/2.4-keyword-grouping.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real problem: a keyword list dumped into one ad group is unmanageable. 10–45s: walk through grouping keywords into themed ad groups by shared shopper intent, and recognizing when a group has grown too broad and needs to split. 45–60s: close with what the learner can now do: turn a raw keyword list into a structure ready to build campaigns on. Tone: direct, plain-spoken, no hype.

### Module 3: Listing Optimization

**3.1: Listing and Ad Relevance Signals**
Source: `content/curriculum/modules/3-listing-optimization/3.1-listing-quality-score.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real diagnostic question: is a weak listing or a weak bid causing the underperformance. 10–45s: walk through reading a listing's CTR, CVR, and other observable signals to tell the two apart. 45–60s: close with what the learner can now do: point to the actual cause instead of guessing. Tone: direct, plain-spoken, real numbers, no hype.

**3.2: Listing Anatomy: Title, Bullets, Images & PPC**
Source: `content/curriculum/modules/3-listing-optimization/3.2-listing-anatomy.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real task: a listing's title, bullets, and images each have a job to do for the ads pointing at them. 10–45s: walk through the PPC-aware formulas for rewriting a title, bullet points, and image sequence so each section pulls its own weight for CTR and CVR. 45–60s: close with what the learner can now do: rewrite a real listing section by section with a reason for each change. Tone: direct, plain-spoken, no hype.

**3.3: A+ Content & Brand Registry Advantage**
Source: `content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real client question: is Brand Registry and A+ Content worth the effort for this specific product. 10–45s: walk through the factors that decide whether it's worth pursuing, and how to roughly estimate the ACoS improvement enrolling could produce. 45–60s: close with what the learner can now do: give a client a real yes-or-no answer backed by a number. Tone: direct, plain-spoken, real numbers, no hype.

### Module 4: Campaign Architecture

**4.1: Sponsored Products: Your Ad's Best Salesperson**
Source: `content/curriculum/modules/4-campaign-architecture/4.1-sponsored-products.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real starting point: every new product needs a first campaign, and getting the structure right the first time saves cleanup later. 10–45s: walk through setting up a basic Sponsored Products structure, choosing match types, and splitting budget across them by purpose. 45–60s: close with what the learner can now do: launch a first campaign with a real structure, not a default template. Tone: direct, plain-spoken, no hype.

**4.2: Sponsored Brands & Display: Beyond the Basics**
Source: `content/curriculum/modules/4-campaign-architecture/4.2-sponsored-brands-display.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real mistake this corrects: defaulting to Sponsored Products for every goal. 10–45s: walk through which ad type (Sponsored Products, Sponsored Brands, or Sponsored Display) actually fits a specific client goal. 45–60s: close with what the learner can now do: recommend the right ad type instead of the familiar one. Tone: direct, plain-spoken, no hype.

**4.3: Campaign Structure: The Filing Cabinet Method**
Source: `content/curriculum/modules/4-campaign-architecture/4.3-campaign-structure.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real problem: a messy campaign structure that nobody, including future-you, can make sense of. 10–45s: walk through the filing-cabinet naming convention so every campaign's purpose, match type, and bid logic is obvious at a glance. 45–60s: close with what the learner can now do: design a clean structure for a new product launch from scratch. Tone: direct, plain-spoken, no hype.

**4.4: Campaign Architecture in Practice: Build Your First Campaign**
Source: `content/curriculum/modules/4-campaign-architecture/4.4-campaign-architecture-practice.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real moment this leads to: walking into the Campaign Builder tool for the first time. 10–45s: walk through writing a plan for structure, keywords, bids, budget, and negatives before placing a single keyword in the tool. 45–60s: close with what the learner can now do: build a campaign in Campaign Builder from a written plan instead of improvising. Tone: direct, plain-spoken, no hype.

### Module 5: Portfolio Strategy

**5.1: Campaign Portfolios: Organizing for Scale**
Source: `content/curriculum/modules/5-portfolio-strategy/5.1-campaign-portfolios.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real trigger: an account with too many campaigns to manage one at a time. 10–45s: walk through deciding when an account has outgrown individual campaign management, and building a portfolio and budget-allocation structure without mixing up portfolio-level budget controls with campaign-level bids and negatives. 45–60s: close with what the learner can now do: organize a growing account without losing track of what controls what. Tone: direct, plain-spoken, no hype.

**5.2: Budget Pacing & Daily Spend Management**
Source: `content/curriculum/modules/5-portfolio-strategy/5.2-budget-pacing.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real mid-day decision: a campaign's budget is burning faster or slower than expected, and today isn't over. 10–45s: walk through reading a campaign's burn rate partway through the day and deciding whether to raise the budget, adjust bids, or leave it alone. 45–60s: close with what the learner can now do: make that call correctly before the day's spend runs out. Tone: direct, plain-spoken, real numbers, no hype.

**5.3: Seasonal Strategy & Promo Planning**
Source: `content/curriculum/modules/5-portfolio-strategy/5.3-seasonal-strategy.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real planning gap: showing up to a big shopping event without a pre-season plan. 10–45s: walk through building a pre-season, in-season, and post-season plan for an Amazon shopping event, and defending a rising ACoS to a client using profit after ad spend instead of the ratio alone. 45–60s: close with what the learner can now do: walk into the next sale event with a plan already built. Tone: direct, plain-spoken, real numbers, no hype.

### Module 6: Bidding Lab

**6.1: Bid Strategies: Flat-Rate, Surge Pricing, and Smart Discounts**
Source: `content/curriculum/modules/6-bidding-lab/6.1-bid-strategies.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real decision: which bid strategy actually fits a campaign's data maturity and margin, not whichever one sounds smartest. 10–45s: walk through choosing between Fixed Bids, Dynamic Up and Down, and Dynamic Down Only, using only what each strategy actually does. 45–60s: close with what the learner can now do: defend a bid-strategy choice with a real reason instead of a guess. Tone: direct, plain-spoken, no hype, no guarantees the strategies themselves don't make.

**6.2: Placement Adjustments: Paying for the Front Row**
Source: `content/curriculum/modules/6-bidding-lab/6.2-placement-adjustments.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real trap: turning on a placement adjustment without knowing what it actually does to the bid. 10–45s: walk through calculating a product's true maximum effective CPC once a placement adjustment and a dynamic bid strategy are both stacked on top of the base bid. 45–60s: close with what the learner can now do: check the real ceiling before turning either setting on. Tone: direct, plain-spoken, real numbers, no hype.

**6.3: Bid Elevator Prep: Ready to Bid**
Source: `content/curriculum/modules/6-bidding-lab/6.3-bid-elevator-prep.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real moment this leads to: walking into the Bid Elevator practice tool with a calculation ready, not a guess. 10–45s: walk through pulling price, CVR, and target ACoS out of a scenario brief, calculating max CPC, and deciding to bid, accept a different ACoS, or walk away from the keyword. 45–60s: close with what the learner can now do: make that same call inside Bid Elevator. Tone: direct, plain-spoken, real numbers, no hype.

### Module 7: Search Term Triage

**7.1: Search Term Analysis: Reading the Data**
Source: `content/curriculum/modules/7-search-term-triage/7.1-search-term-analysis.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real problem: a search term report with hundreds of rows and no clear starting point. 10–45s: walk through sorting every term into one of five categories (harvest, monitor, negate, judge, investigate) using CTR, CVR, and ACoS. 45–60s: close with what the learner can now do: clear a real report by the data instead of gut feel. Tone: direct, plain-spoken, real numbers, no hype.

**7.2: Negative Keywords: The Most Underused Profit Lever**
Source: `content/curriculum/modules/7-search-term-triage/7.2-negative-keywords.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real cost: spend leaking to search terms that were never going to convert. 10–45s: walk through building a negative keyword list straight from a search term report, choosing negative exact or negative phrase per term, and telling spend that should be cut apart from spend that should just be rebid. 45–60s: close with what the learner can now do: build that list from a real report today. Tone: direct, plain-spoken, real numbers, no hype.

**7.3: STR Triage Prep: Ready to Triage**
Source: `content/curriculum/modules/7-search-term-triage/7.3-str-triage-prep.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real moment this leads to: triaging a full batch of search terms at speed inside the STR Triage practice tool. 10–45s: walk through the five-option decision flowchart (Keep, Harvest to Exact, Decrease Bid, Add Negative Keyword, Increase Bid) and choosing fast without second-guessing every term. 45–60s: close with what the learner can now do: apply that same flowchart inside STR Triage. Tone: direct, plain-spoken, no hype.

### Module 8: Competitive Intelligence

**8.1: Brand Analytics: Reading the Competitive Landscape**
Source: `content/curriculum/modules/8-competitive-intelligence/8.1-brand-analytics.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real resource this lesson unlocks: data Amazon already gives every seller, most of them never open. 10–45s: walk through pulling the Top Search Terms and Market Basket Analysis reports from Brand Analytics and turning them into specific new keyword and product-targeting additions. 45–60s: close with what the learner can now do: turn a Brand Analytics report into real campaign changes this week. Tone: direct, plain-spoken, no hype.

**8.2: Share of Voice Analysis & Strategic Positioning**
Source: `content/curriculum/modules/8-competitive-intelligence/8.2-share-of-voice.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real question: how much of a keyword or category does this seller actually own, using only data Amazon gives you. 10–45s: walk through building a Share of Voice estimate, classifying the seller as Contender, Established, or Dominant, and picking the bidding strategy that matches that position. 45–60s: close with what the learner can now do: position a client's bidding strategy against their real competitive standing, not a guess. Tone: direct, plain-spoken, real numbers, no hype.

**8.3: Competitor Benchmarking & Actionable Insights**
Source: `content/curriculum/modules/8-competitive-intelligence/8.3-competitor-benchmarking.mdx`
Prompt: Make a 60-second video overview of this lesson. 0–10s: open with the real habit this builds: a repeatable weekly competitive review, not a one-time snapshot. 10–45s: walk through scoring competitors on the gap-analysis matrix and turning each gap into one specific, trackable campaign action. 45–60s: close with what the learner can now do: run that same review on a real account starting this week. Tone: direct, plain-spoken, no hype.
