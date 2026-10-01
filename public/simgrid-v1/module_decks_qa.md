# One Deck per Module QA

The local viewer was checked with Module 04, **Keywords & Match Types**. It opened the expected independent six-slide sequence and displayed a dedicated final evidence-gate slide with the module exercise, 70% quiz receipt, two 75% simulator receipts, and a module-specific exit ticket.

The Coach Tools page was checked with the module-deck section in view. It presents all twelve direct entries—from Module 00 Amazon Basics through Module 11 VA Workflow & Capstone—with a concise scope description and a route to the matching module deck.

The split preserves animated final-series content at the lesson level and adds each module’s own cover and evidence-gate slide. The static regression suite passed **121 tests** after the module-deck contract tests were added.

## Twelve-slide expansion QA

Every module deck now has exactly **12 motion-enabled HTML slides**. The expanded sequence preserves the final animated source lessons and adds module-specific decision-chain, worked-situation, simulator-brief, guardrail, common-failure, evidence-log, and final-commitment instruction where needed.

Local viewer checks confirmed Module 00 reaches an added **Evidence Log** instructional slide at `11 of 12` and Module 02 reaches its **Final Commitment** slide at `12 of 12`. The updated twelve-slide motion contract and complete SimHub suite passed **121 tests**.

## Public deployment verification

GitHub Pages deployed commit `3ae645e` successfully. The live viewer confirmed Module 00 at `12 of 12`, and the live Coach Tools page lists all twelve module cards, from Amazon Basics through VA Workflow & Capstone, with each routing to its corresponding module deck.
