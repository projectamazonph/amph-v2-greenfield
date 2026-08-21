# Amazon PH Simulator Lesson Enrichment Blueprint

## Executive direction

Lesson 1.1 established the right design principle: **every visual must make a decision easier to see**. The remaining lessons should not receive identical “slide cards.” Each page should be shaped around its dominant reasoning task: compare, classify, calculate, sequence, audit, allocate, triage, or benchmark.

The recommended system is a shared visual grammar with lesson-specific compositions. Reusable primitives should handle metric matrices, comparison tables, funnels, timelines, decision trees, annotated canvases, scorecards, budget charts, classification boards, and practice workbenches. Each lesson then combines two to four primitives into a coherent teaching sequence.

The plan covers the 30 lessons remaining after Lesson 1.1 across Modules 0–8. It preserves the existing learning contracts, worksheet progression, simulator-prep moments, and public curriculum metadata. Visual data must remain grounded in each lesson’s existing examples; no fabricated benchmarks should be introduced.

## Visual archetype system

| Archetype | Best for | Core visual | Interaction | Motion level |
| --- | --- | --- | --- | --- |
| Orientation map | onboarding and module entry | route map, milestone path, annotated platform map | step selection or progress reveal | Low |
| Compare and choose | metrics, ad types, bid strategies | side-by-side matrix, quadrant, paired bars | toggle between options or scenarios | Low–medium |
| Calculate and inspect | CPC, ACoS, ROAS, budgets, bids | formula ladder, KPI strip, worked-example table | input/reveal or scenario switch | Medium |
| Sequence and diagnose | workflows, listing audits, triage | numbered path, decision tree, feedback loop | step focus or branch selection | Medium |
| Classify and route | match types, negatives, search terms | lane board, tag matrix, routing flow | classify an item and reveal rationale | Medium |
| Build and structure | campaign architecture, grouping, portfolios | hierarchy tree, canvas, filing map | progressive build or naming preview | Low–medium |
| Plan across time | seasonal strategy, pacing | timeline, calendar heatmap, ramp curve | phase or date-window toggle | Medium |
| Inspect the market | brand analytics, SOV, benchmarking | gap matrix, trend strip, report-to-insight pipeline | filter or scenario selector | Low–medium |
| Simulation preparation | 4.4, 6.3, 7.3 | scenario brief, rubric, decision board | practice submission and feedback | Low, high clarity |

## Animation rules

Motion should communicate sequence, causality, or change over time. It should never be required to access the lesson’s facts. Entrance motion is limited to one short reveal per block. Calculators may animate a result once after input. Decision trees may highlight the active branch, but every branch remains available in the DOM. Timelines may scrub between phases, but the full timeline is also represented as text and table content.

Every interactive or animated visual must support keyboard focus, visible focus styling, a text alternative, and `prefers-reduced-motion`. No lesson should use continuous looping animation, autoplaying media, or a chart without a readable table or caption.

## Lesson-by-lesson blueprint

### Module 0: Onboarding

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 0.1 Welcome. Your Path to Amazon PPC Work | Orient and motivate | Career-to-competency path; course module route map; “operator habits” checklist | Clickable path stages; low-motion milestone reveal | First professional habit statement | P2 |
| 0.2 Platform Tour and Navigation | Know where work happens | Annotated platform map showing Courses, Tools, Progress, and simulator surfaces; “find the right surface” decision path | Select a task and highlight the correct destination; low motion | Navigation confidence checklist | P2 |
| 0.3 Account Safety and the Client Brief | Intake and risk recognition | Client-brief intake canvas; red-flag matrix; pre-flight checklist | Expand risk categories; checklist completion animation only | Completed client-brief intake | P2 |

### Module 1: Foundations

Lesson 1.1 is the reference implementation for this system. The next four lessons should share its visual language but specialize the reasoning task.

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 1.2 Is My Ad Worth Clicking? CPC and CTR | Compare traffic cost and attention | CPC/CTR 2×2 map; two-product comparison bars; CPC-to-CTR relationship strip | Toggle between “cost problem” and “attention problem”; result reveal | CPC/CTR worksheet update | P1 |
| 1.3 ACoS, TACoS, and Profitability | Connect ad efficiency to profit | ACoS versus TACoS bridge; profitability waterfall; break-even band | Scenario toggle for ad sales versus total sales; medium one-time calculation reveal | Profitability and Max-CPC Sheet | P1 |
| 1.4 ROAS | Translate between inverse efficiency views | ROAS/ACoS paired scale; campaign comparison table; return-per-peso ladder | Toggle ROAS view and ACoS view; animate only the highlighted relationship | Minimum ROAS worksheet field | P1 |
| 1.5 Metrics in Practice | Diagnose multi-signal patterns | Four-pattern matrix; diagnostic decision tree; kitchen-scale scenario walkthrough; maximum-CPC formula ladder | Choose the leading diagnosis and reveal why competing diagnoses are weaker | Completed pattern diagnosis and client explanation | P1 |

### Module 2: Keyword Research

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 2.1 Match Types: Broad, Phrase, Exact | Select the right match-type role | Discovery-to-protection hierarchy; match-type comparison matrix; query expansion examples | Choose a query and show which match type is appropriate; low–medium motion | Match-type grouping decision | P1 |
| 2.2 Keyword Research Workflow & Tools | Run a repeatable research process | Four-step pipeline: research, analyze, prioritize, organize; source-to-keyword flow; KRP scoring matrix | Sort sample keywords into workflow stages; reveal score rationale | Keyword research worksheet | P1 |
| 2.3 Negative Keywords: Stopping Wasted Spend | Stop waste without blocking demand | Before/after search-term flow; negative exact versus negative phrase matrix; three-source evidence stack | Classify terms as negative exact, negative phrase, or keep; medium classification reveal | Negative-keyword list and rationale | P1 |
| 2.4 Keyword Grouping for Campaign Structure | Cluster by intent and theme | Keyword cluster map; one-theme-per-ad-group hierarchy; match-type layering diagram | Place sample terms into groups and preview the resulting campaign structure | Grouping decision and worksheet update | P1 |

### Module 3: Listing Optimization

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 3.1 Listing and Ad Relevance Signals | Audit relevance as a feedback loop | Relevance feedback loop from query to listing to conversion; quick/medium/long-term action timeline; audit scorecard | Select the weak signal and reveal the next audit check; low–medium motion | Listing-Readiness Audit | P2 |
| 3.2 Listing Anatomy: Title, Bullets, Images & PPC | Build a PPC-aware listing | Annotated listing wireframe; title formula ladder; five-bullet framework; image-sequence storyboard | Toggle title/bullet/image layer; focused annotation reveal | Listing Optimization Checklist | P2 |
| 3.3 A+ Content & Brand Registry Advantage | Choose content modules that improve conversion | A+ page storyboard; module comparison matrix; conversion-lift logic chain; Brand Registry access path | Select product context and prioritize modules; medium motion only for module sequencing | A+ content plan and listing audit rationale | P2 |

### Module 4: Campaign Architecture

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 4.1 Sponsored Products | Understand delivery and targeting surfaces | Search-query-to-ad-delivery map; keyword versus product-targeting matrix; budget allocation strip | Choose targeting input and trace the delivery path; medium path highlight | Campaign Brief | P2 |
| 4.2 Sponsored Brands & Display | Assign formats to funnel roles | Full-funnel canvas for SP, SB, video, and SD; format comparison matrix; audience/placement lanes | Select campaign objective and highlight suitable formats; low–medium motion | Campaign map and pre-flight rationale | P2 |
| 4.3 Campaign Structure: Filing Cabinet Method | Build a maintainable hierarchy | Filing-cabinet hierarchy; campaign naming grammar; cross-campaign negative flow; structure QA table | Progressive build from portfolio to campaign to ad group to target; low–medium motion | Campaign Structure Template | P2 |
| 4.4 Campaign Architecture in Practice | Prepare for a build simulation | Scenario brief; campaign build canvas; pre-flight checklist; evaluation rubric | Complete staged build decisions and reveal rubric feedback; low motion, high information density | Launch QA checklist | P1 |

### Module 5: Portfolio Strategy

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 5.1 Campaign Portfolios | Allocate at scale | Portfolio hierarchy; 60/20/10/10 allocation bar; standalone-versus-portfolio decision matrix | Adjust allocation mix and observe the budget distribution; medium calculation reveal | Budget Decision Log | P3 |
| 5.2 Budget Pacing & Daily Spend Management | Control burn rate across time | Daily spend line; burn-rate gauge; weekday pacing calendar; monthly pacing tracker | Change daily budget and inspect projected runout; medium chart transition | Budget Pacing Tracker | P2 |
| 5.3 Seasonal Strategy & Promo Planning | Plan across phases | Pre-season/in-season/post-season timeline; seasonal ramp curve; promotional calendar | Select phase and reveal recommended campaign posture; medium timeline sweep | Seasonal PPC Calendar | P3 |

### Module 6: Bidding Lab

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 6.1 Bid Strategies | Select auction behavior | Auction storyboard; fixed versus dynamic strategy matrix; ACoS outcome bands | Toggle strategy against the same scenario; medium one-time outcome reveal | Bid-Change Plan | P1 |
| 6.2 Placement Adjustments | Calculate multiplier economics | Placement map; multiplier equation ladder; budget tradeoff chart; maximum-CPC calculator | Enter or select placement adjustment and show implied CPC/budget effect; medium | Bid-Change Plan update | P1 |
| 6.3 Bid Elevator Prep | Prepare for a bidding simulation | Scenario brief; bid decision tree; core formula ladder; common-mistake callouts | Step through one bid scenario and reveal rubric feedback; low motion | Simulation-ready bid worksheet | P1 |

### Module 7: Search Term Triage

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 7.1 Search Term Analysis | Classify evidence into actions | Search-term category lanes; weekly optimization cycle; confidence/volume table; harvest-to-negative flow | Classify terms into five categories and reveal action rationale; medium | STR Action Log | P1 |
| 7.2 Negative Keywords: Building a Working List | Reinforce cross-campaign negative logic | Compact cross-campaign routing diagram; exact-versus-phrase matrix; before/after waste strip | Select negative type and show scope impact; low–medium | Working negative list | P2 |
| 7.3 STR Triage Prep | Execute five-action triage | Five-action decision flowchart; data-grid reading guide; simulation rubric | Choose an action for each row and reveal the reason; low motion, high clarity | Triage worksheet | P1 |

### Module 8: Competitive Intelligence

| Lesson | Dominant learning task | Visual sequence | Interaction and motion | Student artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| 8.1 Brand Analytics | Convert reports into market insight | Report-to-insight pipeline; search-frequency, market-basket, and demographics panels; insight card | Select report type and show PPC application; low–medium motion | Competitor Gap-Analysis Worksheet | P3 |
| 8.2 Share of Voice | Interpret position and trend | SOV spectrum; trend strip; contender/established/dominant scenario cards; bid-ceiling check | Toggle scenario and inspect strategy implications; medium | SOV worksheet update | P3 |
| 8.3 Competitor Benchmarking | Convert gaps into action | 2×2 competitive gap matrix; 30-minute weekly review timeline; dashboard wireframe; insight-to-action map | Select a gap and route it to a campaign or listing action; medium | Competitive dashboard and weekly review | P3 |

## Reusable component backlog

The implementation should be staged around primitives, not individual page hacks.

| Component family | Supports lessons | Priority |
| --- | --- | --- |
| `MetricMatrix` and `ComparisonTable` | 1.2, 1.4, 2.1, 3.3, 4.2, 6.1, 6.2, 7.2 | P1 |
| `WorkedExamplePanel` and `FormulaLadder` | 1.2, 1.3, 1.4, 5.2, 6.2, 8.2 | P1 |
| `DiagnosticDecisionTree` and `DecisionFlow` | 1.5, 4.4, 6.3, 7.3 | P1 |
| `ClassificationBoard` and `RoutingBoard` | 2.2, 2.3, 2.4, 7.1, 7.2 | P1 |
| `HierarchyCanvas` | 2.4, 4.3, 5.1 | P2 |
| `AnnotatedListingCanvas` | 3.1, 3.2, 3.3 | P2 |
| `FunnelCanvas` | 4.1, 4.2, 8.1 | P2 |
| `TimelineCalendar` and `PacingChart` | 0.1, 5.2, 5.3, 8.3 | P2 |
| `PracticeWorkbench` and `SimulationRubric` | 0.3, 4.4, 6.3, 7.3 | P1 |
| `GapMatrix` and `InsightRouter` | 8.1, 8.2, 8.3 | P3 |

## Recommended rollout

**Tranche 1 should cover the highest-leverage reasoning lessons:** 1.2–1.5, 2.1–2.4, 6.1–6.3, and 7.1–7.3. These pages teach the repeatable PPC decisions that students will use most often in simulators and client work. They also exercise the shared matrix, calculator, classification, and decision-tree primitives.

**Tranche 2 should cover operational construction:** 3.1–3.3 and 4.1–4.4. These lessons need more bespoke canvases, especially the annotated listing and campaign hierarchy views, but they directly support campaign-build simulations and worksheet deliverables.

**Tranche 3 should cover scale and market context:** 0.1–0.3, 5.1–5.3, and 8.1–8.3. These pages benefit from polished timelines, budget views, competitive matrices, and onboarding maps after the core visual grammar has proven stable.

## Definition of done for each enriched lesson

A lesson is ready when its visual sequence is tied to a stated decision, uses at least one meaningful diagram or table, includes an evidence-backed worked example or classification exercise, preserves the existing worksheet and retrieval sections, renders a semantic text alternative, supports mobile layout, respects reduced motion, and passes the MDX validator, typecheck, architecture tests, and focused renderer tests.

The next build tranche should implement the shared `ComparisonTable`, `FormulaLadder`, `ClassificationBoard`, `DecisionFlow`, and `SimulationRubric` primitives, then enrich Lessons 1.2, 1.3, 2.1, 2.3, 6.1, and 7.1 as representative pages across the most important archetypes.
