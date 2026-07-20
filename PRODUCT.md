# Product

## Register

product

Note: `src/app/page.tsx` (the marketing landing page) is the one brand-register exception on this site. Per `docs/design-brief.md`, it still follows the same dense, utilitarian Field Manual system rather than a typical glossy marketing treatment — but if a future task asks to design or critique it specifically as a conversion surface, treat that one route under the brand register rather than this file's product default.

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

Utilitarian, dense, no-nonsense. The "Field Manual" direction: a 1970s technical reference manual or trading-terminal density, built for someone who needs the information at 2am and has no patience for decoration. The interface should evoke competence and confidence, never admiration — the student is here to work, not to look at the design.

## Anti-references

Not glassmorphism with gradient orbs. Not cyan-on-dark with neon accents. Not a portfolio site with oversized hero text and 80% white space. Not a generic "AI-built SaaS" template indistinguishable from every other one.

## Design Principles

Density is a feature, not a bug — get out of the way of the content. The 2am rule: a tired student on their phone needs to find the quiz retry button without hunting, hero text, or a "we're here to help" interstitial. Information first, decoration last — hierarchy comes from type scale and spacing, not gradients or shadows. Use the accent color with discipline: one element per viewport when possible, two maximum.

## Accessibility & Inclusion

WCAG AA contrast on all text, verified with axe in CI. Every interactive element is keyboard-reachable with a 2px accent focus ring. Every form input has a real label — placeholders don't count. All images carry alt text (decorative images get `alt=""`). All motion respects `prefers-reduced-motion` (fade/slide become instant). Color is never the only signal — errors and success states pair color with text and an icon. Mobile tap targets are at least 44×44px.
