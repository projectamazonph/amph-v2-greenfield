# Next Tranche Enrichment QA

The next tranche covers onboarding lessons 0.1 and 0.3, portfolio lessons 5.1 and 5.3, and competitive-intelligence lessons 8.1 and 8.2. Existing lessons 5.2 and 8.3 already exercise the shared timeline and competitive-gap systems.

The new reusable primitives are `LessonPathway`, `SimulationBriefBuilder`, `PortfolioMap`, `SeasonalCalendar`, `EvidenceLedger`, and `SovPositioner`. Each is transported through a dedicated JSON MDX directive and rendered through `LessonContent`.

Verification passed: 30 focused parser and renderer tests, strict validation for 31/31 lessons, TypeScript typecheck, 674 architecture tests, and `git diff --check`.
