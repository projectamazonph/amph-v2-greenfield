# Pages — Dependency Trees

For each key page, the indented tree below lists every local file the page renders. Traced
recursively from the page entry. Use as the candidate set for `--context-file` calls — apply
the ~900-line budget rule from the Superdesign SOP.

---

## / (Landing)

Entry: `src/app/page.tsx`

```
src/app/page.tsx
├── src/components/landing/PageTexture.tsx
├── src/components/landing/shared.module.css
├── src/components/landing/TopBar.tsx
│   ├── src/components/landing/Logo.tsx
│   └── src/components/landing/constants.ts
├── src/components/landing/Ticker.tsx
├── src/components/landing/Hero.tsx
│   └── src/domain/curriculum/PublicCurriculumClaims.ts
├── src/components/landing/StatsStrip.tsx
├── src/components/landing/Method.tsx
├── src/components/landing/SimulatorSection.tsx
│   └── src/components/landing/BidElevator.tsx
├── src/components/landing/Curriculum.tsx
├── src/components/landing/WhoFor.tsx
├── src/components/landing/Pricing.tsx
├── src/components/landing/Mentor.tsx
├── src/components/landing/Proof.tsx
├── src/components/landing/FAQSection.tsx
├── src/components/landing/DarkCTA.tsx
└── src/components/landing/Footer.tsx
    └── src/components/landing/Logo.tsx
```

## /dashboard (Student hub)

Entry: `src/app/dashboard/page.tsx`

```
src/app/dashboard/page.tsx
├── src/components/student/StudentSidebar.tsx
├── src/components/astryx/*  (multiple atoms — use Astryx tokens, not raw DOM)
├── src/domain/curriculum/PublicCurriculumClaims.ts
└── src/composition/container.ts (resolve via getContainer, not direct import)
```

## /courses/[slug]/[lesson] (Lesson reader)

Entry: `src/app/courses/[slug]/[lesson]/page.tsx`

```
src/app/courses/[slug]/[lesson]/page.tsx
├── src/components/lesson/*  (GlossaryTerm, QuickCheck, SelfCheck, etc.)
├── src/components/astryx/*  (prose + code-block primitives)
├── src/components/student/StudentSidebar.tsx (when embedded)
└── src/domain/curriculum/CurriculumInventory.ts (tool-bridge lookup)
```

## /tools/bid-elevator (Simulator)

Entry: `src/app/tools/bid-elevator/page.tsx`

```
src/app/tools/bid-elevator/page.tsx
├── src/components/tools/bid-elevator/BidElevatorForm.tsx
├── src/components/tools/bid-elevator/BidElevatorResult.tsx
├── src/components/tools/FormativeScoreNotice.tsx (shared simulator notice)
├── src/components/student/StudentSidebar.tsx
└── src/app/actions/bidElevator.action.ts (server action, thin wrapper)
```

## /admin (Admin dashboard)

Entry: `src/app/admin/page.tsx`

```
src/app/admin/page.tsx
└── src/app/admin/layout.tsx
    └── src/components/admin/AdminSidebar.tsx
```

## /login

Entry: `src/app/login/page.tsx`

```
src/app/login/page.tsx
├── src/app/(auth)/layout.tsx (centered card shell)
├── src/components/auth/LoginForm.tsx (client)
└── src/components/ui/Input.tsx + Button.tsx
```

## /profile/security

Entry: `src/app/profile/security/page.tsx`

```
src/app/profile/security/page.tsx
├── src/components/profile/SecuritySettings.tsx
├── src/components/student/StudentSidebar.tsx
└── src/app/actions/twoFactor.action.ts
```

---

**Context-budget rule:** landing alone is ~14 components plus 14 CSS modules; passing all of them
together will 400. For landing canvas drafts, prefer passing:
1. `theme.md` (compact token summary)
2. `components.md` (Button + Card excerpts)
3. `src/components/landing/Hero.tsx`, `Hero.module.css` (full)
4. `src/components/landing/Pricing.tsx`, `Pricing.module.css` (full)
5. `src/components/landing/shared.module.css` (full — landing primitive tokens)
6. `src/components/landing/TopBar.tsx`, `TopBar.module.css` (line-ranged to render branch)

Skip data-fetching, event handlers, hooks above the render — they're stripped in reproduction
context anyway.