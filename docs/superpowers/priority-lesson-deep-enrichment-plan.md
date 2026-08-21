# Priority Lesson Deep-Enrichment Plan

## Coordinated visual sequences

| Lesson | Existing visual | Deeper additions | Teaching arc |
| --- | --- | --- | --- |
| 1.2 CPC and CTR | Product comparison and maximum-CPC formula | Decision flow for high-CPC/low-CTR diagnosis; funnel map from impression to order | Compare cost and attention, calculate the ceiling, diagnose before changing the bid |
| 1.3 ACoS/TACoS/profitability | Existing trade-off and process | Formula ladder for break-even ACoS; comparison table for ad-only versus store-level views; decision flow for profitability calls | Move from metric definition to profit context to a defensible action |
| 2.1 Match types | Existing prose and comparison table | Comparison table for discovery/scaling/protection roles; hierarchy builder for match-type layering; decision flow for choosing a match type | Match the targeting surface to confidence and intent |
| 2.3 Negative keywords | Existing classification board | Comparison table for negative exact versus phrase; timeline calendar for negative-maintenance cadence; decision flow for scope | Identify waste, choose the narrowest safe block, place it at the correct scope, review it on schedule |
| 6.1 Bid strategies | Existing strategy prose | Comparison table for fixed/up-and-down/down-only; formula ladder for effective-bid risk; decision flow for strategy selection | Understand the auction, compare control profiles, choose a strategy under constraints |
| 7.1 Search-term analysis | Existing category prose | Classification board for five actions; decision flow for weekly triage; timeline calendar for review cadence | Classify evidence, route it to an action, repeat the cycle consistently |

## New competitive-intelligence primitives

`CompetitiveGapMatrix` renders competitors across dimensions such as visibility, relevance, offer, and conversion confidence. It supports selecting a competitor or gap cell and exposes the corresponding evidence and campaign/listing action.

`InsightRouter` turns a market observation into a bounded action by connecting the signal, implication, next evidence check, and recommended action. It is intentionally not a dashboard: the goal is to prevent “interesting data” from being mistaken for a decision.

Both components use semantic tables or button-based selection, provide text alternatives, and support reduced motion.
