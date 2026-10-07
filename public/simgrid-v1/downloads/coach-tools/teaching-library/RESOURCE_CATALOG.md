# Amazon PH Simulators — Expanded Teaching Library

## Purpose

This library converts the twelve-module PPC Coach pathway into downloadable working artifacts. It is designed to make learners **calculate, classify, choose, record, and defend** decisions rather than passively review vocabulary. Every resource points back to the associated simulator assignment and the program’s operating rules: work from evidence, change one variable at a time, and diagnose performance in the order of stock, price, reviews, and competitors.

## Resource architecture

| Collection                       | Files | Learning job                                                                                                                  | Format   |
| -------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| Module field handouts            |    12 | Explain the lesson outcome, the operating rule, a worked example, a practice prompt, and the simulator handoff.               | Markdown |
| Learner worksheet pack           |    12 | Give each module an evidence-capture and decision-writing exercise.                                                           | Markdown |
| Decision cheat sheets            |    12 | Provide a fast, one-page-style reference for thresholds, distinctions, and safe next actions.                                 | Markdown |
| Operating templates              |    10 | Standardize campaign, keyword, listing, launch, bidding, harvest, optimization, reporting, permissions, and capstone records. | Markdown |
| Implementation guides            |     6 | Teach repeatable workflows for readiness, launching, harvesting, optimizing, reporting, and escalation.                       | Markdown |
| Facilitator and assessment tools |     4 | Observe practice, score decision quality, structure capstone evidence, and run retrieval checks.                              | Markdown |
| Automated workbooks              |     5 | Calculate PPC metrics and support structured campaign, pacing, harvest, reporting, and capstone decisions.                    | XLSX     |

## Module coverage matrix

|                           Module | Handout                     | Worksheet             | Cheat sheet                  | Automated support                  | Primary simulator handoff          |
| -------------------------------: | --------------------------- | --------------------- | ---------------------------- | ---------------------------------- | ---------------------------------- |
|                0 · Amazon Basics | Marketplace visibility      | Listing anatomy audit | Buy Box diagnostic           | Listing inputs in campaign planner | BuyBox Dojo                        |
|                 1 · What is PPC? | Auction and funnel          | Click-funnel trace    | Auction vocabulary           | PPC math lab                       | AdConsole Pro                      |
|                   2 · Money Math | Economics guardrails        | Formula practice      | Metric formula card          | PPC Math Lab                       | Keyword Lab                        |
|           3 · Campaign Structure | Hierarchy and naming        | Structure blueprint   | Structure rules              | Campaign Build Planner             | Campaign Architect                 |
|       4 · Keywords & Match Types | Intent control              | Keyword mapping       | Match-type action card       | Campaign Build Planner             | Keyword Lab + Search Term Triage   |
|            5 · Listing Readiness | Conversion before traffic   | Readiness scorecard   | Conversion-leak order        | Campaign Build Planner             | BuyBox Dojo                        |
|               6 · Campaign Setup | Safe starter launch         | Launch brief          | Starter structure            | Launch & Pacing Workbench          | Campaign Architect + AdConsole Pro |
|               7 · Bids & Budgets | Controlled changes          | Bid rationale         | Bid and budget guardrails    | Launch & Pacing Workbench          | Bid Decisions + Pacing Deck        |
|     8 · Search Terms & Negatives | Harvest loop                | Search-term triage    | Classification decision tree | Harvest & Optimization Workbench   | Search Term Triage + Bulk File     |
|          9 · Weekly Optimization | Weekly operating cadence    | Experiment record     | One-variable rule            | Harvest & Optimization Workbench   | Account Audit + Search Term Triage |
| 10 · Reporting & Troubleshooting | Evidence to narrative       | Client update draft   | Five-failure sequence        | Harvest & Optimization Workbench   | Account Audit                      |
|      11 · VA Workflow & Capstone | Permission-aware operations | Capstone case file    | Escalation ladder            | Capstone Operations Workbook       | Client Onboarding + Capstone       |

## Automation specifications

| Workbook                         | Main editable inputs                                                                               | Automated outputs                                                                                   | Guardrails                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| PPC Math Lab                     | Impressions, clicks, orders, spend, sales, margin, target ACOS                                     | CTR, CVR, CPC, ACOS, ROAS, TACoS, break-even ACOS, target CPC                                       | Inputs are highlighted; formula cells are locked-looking but remain editable in local copies. |
| Campaign Build Planner           | Product, marketplace, campaign goal, targeting, match type, daily budget, listing-readiness checks | Campaign naming pattern, hierarchy plan, readiness result                                           | Data validation on campaign type, match type, and readiness status.                           |
| Launch & Pacing Workbench        | Baseline bid, proposed bid, clicks, conversion rate, daily budget, sales target                    | Bid change percentage, click capacity, sales estimate, budget-use projection, four-week launch plan | Requires a stated evidence reason, guardrail, and review date.                                |
| Harvest & Optimization Workbench | Search-term metrics, performance thresholds, decision status, weekly baseline / outcome            | Suggested decision classification, spend delta, ACOS delta, experiment log, report narrative prompt | Limits each record to one variable and requires a review date.                                |
| Capstone Operations Workbook     | Permission level, client request, baseline, action, result, owner, due date                        | Escalation flag, capstone evidence checklist, readiness score                                       | Independent / notify / approval-required status uses data validation.                         |

## Quality standard

Every file must open with a clear purpose, expose editable fields plainly, and require a learner to record evidence before selecting an action. The content is instructional—not a promise of advertising outcomes—and it should always be used alongside the live simulator assignments and instructor feedback.
