# Product

## Register

product

`src/app/page.tsx` is the marketing conversion surface, but it uses the same simulator system as the product: navy operating context, cool work surfaces, white cards, clear action hierarchy, and restrained motion. When designing or critiquing it as a conversion surface, preserve those shared visual rules rather than introducing a disconnected marketing style.

## Platform

web

## Users

Primary: Filipino virtual assistants, age 22–40, currently earning ₱15k–₱30k/month, looking to specialize in Amazon advertising so they can charge ₱60k–₱80k/month. They arrive with some VA experience but little to no formal Amazon ads training, and they're evaluating whether this platform's certification will actually move the needle with clients.

Secondary: existing PPC specialists expanding into Amazon, agency staff upskilling, and self-paced learners who prefer hands-on practice over video lectures.

Explicitly not the audience: people outside the Philippines, and VAs already earning ₱80k+/month (they're competitors to the platform's outcome, not customers).

## Product Purpose

A paid training platform teaching Amazon PPC through structured courses, five interactive practice simulators (Campaign Builder, Bid Elevator, Search Term Triage, Listing Audit, Keyword Research), gamification (XP, badges, streaks), and verified certificates. Success is a student completing a tier, passing its quizzes, running its simulators, and earning a certificate credible enough to help them land ₱60k–₱80k/month client work.

## Positioning

Three courses, one outcome: the VA becomes the Amazon ads specialist clients retain at ₱60k–₱80k/month. The differentiator against every other course site is practice with real tools — the simulators — not just video and quizzes.

## Brand Personality

Operational, capable, and direct. The simulator system gives learners a familiar navy shell, cool work surfaces, clear white cards, compact controls, and deliberate Amazon Orange actions. The interface should evoke competence and confidence while maintaining enough hierarchy and elevation for fast, low-friction work.

## Anti-references

Not glassmorphism with gradient orbs. Not cyan-on-dark with neon accents. Not a portfolio site with oversized hero text and 80% white space. Not a generic "AI-built SaaS" template indistinguishable from every other one.

## Design Principles

Density is a feature, not a bug — get out of the way of the content. The 2am rule: a tired student on their phone needs to find the quiz retry button without hunting or unnecessary interruption. Information comes first; hierarchy comes from defined type roles, cool work surfaces, border rhythm, and restrained elevation. Use Amazon Orange deliberately for primary actions, selected context, and focus.

## Accessibility & Inclusion

WCAG AA contrast on all text, verified with axe in CI. Every interactive element is keyboard-reachable with a 2px accent focus ring. Every form input has a real label — placeholders don't count. All images carry alt text (decorative images get `alt=""`). All motion respects `prefers-reduced-motion` (fade/slide become instant). Color is never the only signal — errors and success states pair color with text and an icon. Mobile tap targets are at least 44×44px.
