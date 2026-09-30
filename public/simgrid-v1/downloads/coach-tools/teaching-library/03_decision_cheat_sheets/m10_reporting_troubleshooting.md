# Module 10 Decision Cheat Sheet — Reporting & Troubleshooting

## One-line objective

Write plain-language reports and troubleshoot the five classic failure patterns.

> **Non-negotiable:** A report earns trust when it links result, driver, action, guardrail, and checkpoint.

## Fast decision sequence

1. **Observe:** identify the signal and its source.
2. **Diagnose:** explain the most plausible leak or opportunity.
3. **Choose:** take the smallest safe action.
4. **Control:** name the guardrail and owner.
5. **Review:** set a date or evidence threshold.

## Signals at a glance

| Signal                               | Use it to             |
| ------------------------------------ | --------------------- |
| Result versus target                 | Observe before acting |
| Primary driver supported by evidence | Observe before acting |
| Action and owner                     | Observe before acting |
| Guardrail and next checkpoint        | Observe before acting |

## Safe action standard

Fix the earliest confirmed failure in the customer path before treating downstream PPC symptoms.

## Ask before saving a change

| Question                                  | If the answer is “no”                         |
| ----------------------------------------- | --------------------------------------------- |
| Can I point to evidence?                  | Watch, research, or request the missing data. |
| Is the action within my permission level? | Notify or escalate.                           |
| Does it change only one variable?         | Split the actions into separate tests.        |
| Is there a guardrail and review date?     | Do not execute yet.                           |

## Core vocabulary

| Term                  | Meaning                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| Driver                | The evidence-supported cause or contributor to a result.               |
| Guardrail             | The condition that prevents an action from creating unacceptable risk. |
| Checkpoint            | The agreed date or condition for review.                               |
| Troubleshooting order | Stock → price → reviews → competitors → PPC.                           |

**Practice handoff:** Account Audit + Report Builder · **Target:** 75% simulator / 70% quiz
