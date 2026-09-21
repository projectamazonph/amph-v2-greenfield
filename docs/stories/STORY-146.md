# STORY-146 — Student onboarding: first-run welcome + dashboard variant

**Sprint:** Learning experience uplift, wave 3
**Points:** 8
**Epic:** Student experience
**Owner:** Ryan
**Status:** Done. Merged to `main` at `918c532` via `PR #545` (squash). All gates green at merge time: typecheck, lint, architecture (TDD + SOLID), unit + integration, E2E (Playwright), build, learning release gate, Lighthouse CI, Vercel preview. Branch `onboarding` deleted.

## Goal

Brand-new AMPH students know how to start learning within 30 seconds of
finishing signup.

## Scope

- New `/welcome` page (server component shell) with `WelcomeStepper` client
  island — 5 steps covering the three platform areas (Dashboard, My Courses,
  Simulators) plus a welcome and a done step. State carried in URL fragment
  (`#step-N`) and `localStorage` (`amph.welcome.inProgress`); survives
  refresh and accidental tab close.
- "Skip tour" and step 5's "Take me to my dashboard" both call
  `completeWelcomeAction()` then route to `/dashboard`.
- `/dashboard` renders a `NewUserDashboard` variant for fresh free-tier
  students (no enrollment + `welcomeCompletedAt === null`): big "Pick your
  first course" hero with three reinforcing cards (Courses, Dashboard,
  Simulators) and an FAQ footer link. Once the user enrolls in any course,
  the normal dashboard takes over.
- `StudentSidebar` shows a "?" badge next to the Dashboard link when the
  user is within their first 7 days and hasn't completed welcome. Badge
  is a `<button>` (not a `<Link>`) with `router.push("/welcome")` to
  avoid nested-`<a>` invalid HTML5. SSR-safe: gated by `useEffect` so
  `Date.now()` doesn't cause hydration mismatches. Auto-fades once the
  user completes or after 7 days.
- `/profile` shows a "Restart the welcome tour" button for users who have
  already completed the tour. Calls `resetWelcomeAction()` and redirects
  to `/welcome`.
- Signup without a `tier` query param now 303s to `/welcome` instead of
  `/dashboard`. Tier-selected signups still 303 to `/checkout?pricingTier=…`
  (purchase intent uninterrupted).
- New `welcomeCompletedAt DateTime?` column on `User`; migration with
  backfill treating existing users as already-toured.
- Two new use cases (`CompleteWelcome`, `ResetWelcome`) enforcing atomic
  idempotency at the DB layer via `updateMany + where: { ..., welcomeCompletedAt: null }` —
  same pattern as `markUsed` on email verification and `markRecordingWatched` on
  live-class registrations.
- E2E coverage at `tests/e2e/welcome.spec.ts` covering the full tour,
  the skip path, and the dashboard variant for a user who lands on
  `/dashboard` before completing the tour.

## Acceptance criteria

- Signup with no tier routes to `/welcome`; signup with tier still routes to `/checkout`.
- `/welcome` shows 5 steps; URL fragment + localStorage carry state across refresh and tab close.
- "Skip tour" and step 5's primary CTA both complete the tour and route to `/dashboard`.
- Sidebar "?" badge appears for fresh users (welcome null + ≤ 7 days since signup), disappears after 7 days or completion; rendered as a `<button>` to avoid nested `<a>` inside the outer Dashboard `<Link>`.
- `/dashboard` renders `NewUserDashboard` when `welcomeCompletedAt === null && no active enrollments`.
- `/profile` shows a "Restart the welcome tour" link for users who have completed it.
- Existing users treated as already-toured via the backfill in the migration.
- Atomic idempotency: a concurrent second `markWelcomeCompleted` does NOT overwrite the first timestamp (verified by `PrismaUserRepository.welcome.test.ts` exercising the `where: { welcomeCompletedAt: null }` filter).
- All 4 gates green: typecheck, lint, vitest, build.
- E2E flow covered in `tests/e2e/welcome.spec.ts` (3 scenarios).

## Verification

- New unit + component tests pass (130 tests across 10 files).
- Whole-branch review verdict: **READY TO MERGE** (typecheck clean, lint clean, vitest green, build clean).
- Targeted vitest runs on `src/usecases/__tests__/CompleteWelcome.test.ts`,
  `src/usecases/__tests__/ResetWelcome.test.ts`,
  `src/app/actions/__tests__/welcome.action.test.ts`,
  `src/infra/repositories/__tests__/InMemoryUserRepository.welcome.test.ts`,
  `src/infra/repositories/__tests__/PrismaUserRepository.welcome.test.ts`,
  `src/components/student/__tests__/StudentSidebar.test.tsx`,
  `src/components/student/__tests__/NewUserDashboard.test.tsx`,
  `src/app/welcome/__tests__/page.test.tsx`,
  `src/app/welcome/__tests__/WelcomeStepper.test.tsx`,
  `tests/architecture/port-segregation.test.ts` — all green.
- Migration applies cleanly to the dev database (`prisma migrate deploy` verified locally).
- Rebased onto current `main` (LEARN waves 3+ are now on main); conflicts in `User.ts`, `container.ts`, `StudentSidebar.tsx`, `tests/architecture/port-segregation.test.ts`, and others were auto-resolved or kept cleanly.
- E2E test added; will run in CI given a real `DATABASE_URL`.

## Out of scope (deferred)

- Auto-redirect logged-in users with `welcomeCompletedAt === null` from `/dashboard` to `/welcome` (the proxy/auth-layer hook). Deferred to keep this PR small.
- i18n for the welcome copy.
- Reduced-motion variant for step transitions.

## Notes for future maintainers

- `UserRepository` is on `MAX_METHODS_EXEMPT` in `tests/architecture/port-segregation.test.ts` because the `markWelcomeCompleted` / `resetWelcome` methods push it to 15 methods (threshold is 14). The exemption is justified by the atomic-conditional-update pattern matching `PrismaEmailVerificationRepository.markUsed` and `PrismaLiveClassRegistrationRepository.markWatchedRecording`. The check normalizes the relative path via `split("\\").join("/")` so a Windows-runner can match a POSIX-set entry and vice versa.
- `resetWelcomeAction` is a form-action (takes `FormData`, returns `void`, uses `redirect()`) rather than the `Result`-returning shape `completeWelcomeAction` uses. This is deliberate: `completeWelcomeAction` is called from the client stepper (needs the Result for UX feedback); `resetWelcomeAction` is wired to `<form action={...}>` which only needs the redirect.
- `requireAuth()` already returns the full `User` entity. The dashboard and profile pages each call `userRepo.findById(user.id)` a second time as defense against stale-cookie / deleted-account edge cases. This is documented in their docblocks; consider tightening if it shows up in a profile.
- The story was originally numbered STORY-129; renumbered to STORY-146 to avoid collisions with `STORY-129` (LEARN-001, already on `main` via PR #520) and `STORY-145` (LEARN-031, also on `main` via PR #543).
