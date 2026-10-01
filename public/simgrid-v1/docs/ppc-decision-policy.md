# PPC Decision Policy

This document is the beginner-safe source of truth for equivalent PPC decisions across PPC Coach and simulator content. The executable contract lives in `assets/ppc-decision-policy.js`.

Live simulator site: https://projectamazonph.github.io/amazon-ph-simulators/

## Evidence bands

| Clicks | Band           | Default posture                                               |
| ------ | -------------- | ------------------------------------------------------------- |
| 0–9    | Thin           | Watch; do not scale from one lucky sale                       |
| 10–19  | Emerging       | Inspect query mix; make only low-risk changes                 |
| 20–39  | Decision-ready | Diagnose relevant non-converters; allow bounded bid decisions |
| 40+    | Confident      | Take controlled action when tracking and context are valid    |

Confirmed irrelevance is an intent decision, not a statistical-performance decision. It may be negated before a generic click threshold when the product/query mismatch is clear.

## Canonical actions

| Signal                                     | Recommendation                                 |
| ------------------------------------------ | ---------------------------------------------- |
| One irrelevant query                       | Negative exact                                 |
| Repeated irrelevant modifier/theme         | Negative phrase                                |
| Relevant, under 20 clicks, no orders       | Watch                                          |
| Relevant, 20–39 clicks, no orders          | Diagnose listing, offer, and query fit         |
| Relevant, 40+ clicks, no orders            | Lower bid or pause target after validation     |
| Converting above target ACOS               | Lower bid about 15%; do not negate a converter |
| Proven converting below target ACOS        | Controlled 10% bid raise                       |
| Profitable, proven, budget-capped campaign | Raise budget 10–20% with guardrails            |
| Budget-capped but inefficient campaign     | Fix efficiency before adding budget            |

## Assessment labels

- Module pass: 70%
- Simulator proficiency: 75%
- Supervised readiness: 85%

Scenario-specific business constraints can require escalation or a safer action, but must not silently contradict these baseline recommendations.
