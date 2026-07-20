# STORY-046: Admin layout + dashboard

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-046-prep-1 (tokens), STORY-046-prep-2 (`requireAdmin`), STORY-046-prep-3 (component library)
**Blocks:** STORY-047, STORY-048, STORY-049, STORY-050 (all admin pages)
**Status:** ✅ Done (PR #046, commit `b2592cd` — `feat(admin): STORY-046 admin layout + dashboard`; `src/app/admin/layout.tsx` + `src/app/admin/page.tsx` live)

## Goal

Ship the admin shell and the admin dashboard. After this story:

- `/admin/*` is the admin route group, server-rendered, requires `ADMIN` role
- The `/admin` index renders a 6-tile stat dashboard + recent activity + pending actions
- The admin layout is the **NavSidebar pattern from design spec §9.1** — 240px fixed-left, brand + nav + user card, with the AMPH logotype and "Admin" badge
- Every admin page (this story + STORY-047+048+049+050) uses the same shell
- The user card in the sidebar bottom shows the admin's name, role, and a logout button

## Why

Sprint 10 is the admin panel. The first story of a UI sprint always lands the shell, because every other story in the sprint builds pages inside it. Without a working shell, STORY-047 (admin users list) etc. would each have to invent their own layout.

## Acceptance Criteria

- [ ] `src/app/admin/layout.tsx` (server component):
  - Calls `requireAdmin()` at the top — redirects to `/login` if not signed in, `/dashboard?error=forbidden` if not admin
  - Renders the NavSidebar + main content area
  - No `<html>`/`<body>` (the root layout owns those)
- [ ] `src/app/admin/layout.module.css` — the 240px-sidebar + flex-content layout
- [ ] `src/components/admin/NavSidebar.tsx` + `NavSidebar.module.css` (server component):
  - Brand logotype "AMPH Academy" + "Admin" badge (`--danger-soft` bg, `--danger` text, 11px)
  - 10 nav items per design spec §9.1: Dashboard, Users, Courses, Content, Payments, Refunds, Live Classes, Simulators, Badges, Settings
  - Each item: icon (20px), label, 12px vertical padding, hover `--surface-2` bg, active has 2px `--accent` left border
  - Bottom: user card (avatar with first letter, name, "ADMIN" role, logout button)
- [ ] `src/components/admin/TopBar.tsx` + `TopBar.module.css` (server component):
  - Optional breadcrumb slot on the left
  - H1 (page title) + optional subtitle
  - Right: action button slot
  - Padding: `--space-8 0` header block, `--space-6 0` between header and content
- [ ] `src/app/admin/page.tsx` — the admin dashboard:
  - TopBar with "Admin Dashboard" h1 + "Welcome, [name]" subtitle
  - 6 stat tiles in a row (using `Card` from `@/components/ui`):
    - Total Users (count of users with role STUDENT)
    - Total Courses (count of courses)
    - Active Enrollments (count of enrollments with active status)
    - Revenue (sum of paid orders in PHP)
    - Certificates Issued (count of non-revoked certificates)
    - Pending Refunds (count of refund requests with status REQUESTED)
  - Recent activity: simple table of last 5 audit log entries
  - Pending actions: list of pending refunds + flagged items
- [ ] `src/app/admin/__tests__/page.test.tsx` — tests for the admin page (mocked requireAdmin, mocked container)
- [ ] `src/components/admin/__tests__/NavSidebar.test.tsx` — tests for active state, user card
- [ ] `src/components/admin/__tests__/TopBar.test.tsx` — tests for breadcrumb slot
- [ ] `src/app/api/admin/stats/route.ts` — server action or API route that returns the 6 stats (so the page is testable without a full DB seed)
  - Actually — per SOLID, this is a use case (`GetAdminDashboardStats`), not an API route. Move to `src/usecases/GetAdminDashboardStats.ts` + the page calls it via `container.getAdminDashboardStats.execute()`. **Important: the greenfield's SOLID pattern is "use case per business operation".**
- [ ] `src/usecases/GetAdminDashboardStats.ts` (use case) — depends on `UserRepository`, `CourseRepository`, `OrderRepository`, `EnrollmentRepository`, `CertificateRepository`
- [ ] `src/usecases/__tests__/GetAdminDashboardStats.test.ts` — tests for each stat calculation
- [ ] `src/composition/container.ts` — adds `getAdminDashboardStats: GetAdminDashboardStats` to `AppContainer`
- [ ] `src/lib/auth.ts` — already has `requireAdmin` from prep-2; no changes needed
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` 794 + new tests passing
- [ ] `pnpm build` succeeds (or — if the pre-existing `InMemoryEmailSender` build break still exists — `tsc + vitest` remain the working quality gates)

## Files to Create

```
src/app/admin/
├── layout.tsx
├── layout.module.css
├── page.tsx
├── page.module.css
└── __tests__/
    └── page.test.tsx

src/components/admin/
├── NavSidebar.tsx
├── NavSidebar.module.css
├── TopBar.tsx
├── TopBar.module.css
├── UserCard.tsx
├── UserCard.module.css
└── __tests__/
    ├── NavSidebar.test.tsx
    ├── TopBar.test.tsx
    └── UserCard.test.tsx

src/usecases/
├── GetAdminDashboardStats.ts
└── __tests__/
    └── GetAdminDashboardStats.test.ts
```

## Files to Read

- `docs/ui-specs/DESIGN-SPEC.md` §9 (admin patterns)
- `docs/ui-specs/refs/admin-users-page.tsx` (parent's real admin layout, for the patterns)
- `docs/ui-specs/refs/admin-courses-page.tsx` (for stat-tile pattern)
- `src/lib/auth.ts` (`requireAdmin` from prep-2)
- `src/composition/container.ts` (for adding the new use case)
- `src/ports/repositories/UserRepository.ts` (for `findAll` / counting)
- `src/ports/repositories/CourseRepository.ts`
- `src/ports/repositories/IOrderRepository.ts`
- `src/ports/repositories/IEnrollmentRepository.ts`
- `src/ports/repositories/ICertificateRepository.ts`

## Code shape

```ts
// src/usecases/GetAdminDashboardStats.ts
import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
// ... etc

export interface AdminDashboardStats {
  totalStudents: number;
  totalCourses: number;
  activeEnrollments: number;
  totalRevenuePhp: number;
  certificatesIssued: number;
  pendingRefunds: number;
}

export type GetAdminDashboardStatsError = { kind: "db_error"; message: string };

export class GetAdminDashboardStats {
  constructor(private readonly deps: {
    userRepo: UserRepository;
    courseRepo: CourseRepository;
    orderRepo: IOrderRepository;
    enrollmentRepo: IEnrollmentRepository;
    certificateRepo: ICertificateRepository;
  }) {}

  async execute(): Promise<Result<AdminDashboardStats, GetAdminDashboardStatsError>> {
    // Query each repo, build the stats object, return Result.ok
  }
}
```

```tsx
// src/app/admin/layout.tsx
import { requireAdmin } from "@/lib/auth";
import { NavSidebar } from "@/components/admin/NavSidebar";
import styles from "./layout.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className={styles.shell}>
      <NavSidebar user={user} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
```

```tsx
// src/app/admin/page.tsx
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import styles from "./page.module.css";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const { getAdminDashboardStats } = buildContainer();
  const statsResult = await getAdminDashboardStats.execute();
  // ... render TopBar + stat tiles + recent activity
}
```

## Pitfalls

- **`requireAdmin` redirects via `redirect()`** which throws. The page must NOT do any work after `requireAdmin` — it's the first line. If you accidentally put it after a `buildContainer()` call, the redirect still works but you wasted a DB hit.
- **Stat tile formatting** — numbers should be in JetBrains Mono per design spec §2 ("Numeric values... always JetBrains Mono"). Revenue is in PHP, formatted with `formatPhp` (which lives in a future `src/lib/format.ts` — for prep-3 prep we used an inline `Intl.NumberFormat` call).
- **Stat tiles need data** — if the repos don't support counting (most don't have a `count()` method today), the use case has to load all rows and count. For a small app that's fine; for scale it'd be slow. Add a comment that this is a small-N optimization, not a scale solution.
- **Active enrollment definition** — what does "active" mean? The `Enrollment` entity doesn't have a status field today; it's either present or not. Use "present in the enrollments table" as the definition. Document the assumption.
- **Revenue is sum of paid orders** — not gross, not refunds-adjusted. The order's `isPaid()` method should be the gate. Format as PHP (₱) with thousands separators.
- **NavSidebar with 10 items** — at default font size + 12px vertical padding + icon, the sidebar is ~520px tall. Below the nav, the user card. On a 720px viewport (short laptop), the user card might overflow. Add `overflow-y: auto` on the nav list so it scrolls if needed; the user card stays pinned to the bottom.
- **Active state on NavSidebar** — needs to know the current pathname. In a server component, that's `headers().get('x-pathname')` (set by middleware) OR `headers().get('referer')` OR a manual prop. Cleanest: pass `currentPath` as a prop from the layout.
- **Icon set** — the design spec §7 says Phosphor light. There's no `Icon` component yet (out of scope for prep-3). For this story, use inline SVGs or unicode glyphs. The future `Icon` component (prep-?) will consolidate this.
- **Test mocking** — the admin page calls `requireAdmin` which calls `next/navigation` `redirect`. We can't easily render the page in a test without mocking those. Best approach: test the use case directly (lots of value there) and test the components in isolation (NavSidebar, TopBar, stat tile). Skip the page-level integration test; it adds little value over the use case + component tests.
- **`User` has `subscriptionTier`** but the design spec doesn't show a subscription stat. Use `role: 'STUDENT'` as the "totalStudents" definition. Document.
- **Pre-existing build break in `InMemoryEmailSender`** — not introduced by this story. `tsc + vitest` remain the working quality gates.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-please" \
  pnpm vitest run
```

Manual smoke (in a follow-up, not this PR):
- Manually set the `amph_session` cookie to a valid JWT in DevTools
- Visit `/admin` in a browser
- Confirm: sidebar renders, dashboard tiles render with real numbers, layout doesn't break at 1024px or 1280px
- Visit `/admin/users` (doesn't exist yet → 404 expected) — confirms the shell works but the child route isn't built
- Sign out → visit `/admin` → should redirect to `/login`

## Out of scope

- **STORY-047 to 050** (admin child pages: users list, courses CRUD, payments, refunds, simulators, live classes, badges, settings) — each is its own 1-pt story
- **The Icon component** (consolidate Phosphor SVGs into one place) — future story
- **`src/lib/format.ts`** (formatPhp, formatDate, formatRelative) — use inline `Intl.NumberFormat` for now; consolidate in a future story
- **The `AdminAuditLog` table** (recent activity needs an audit log) — the recent activity section can be empty for now, or read from a placeholder; building the audit log is its own story
- **Dark mode** — the token system is dark-mode-ready; the admin pages render in light mode for now
- **Mobile admin** — the design spec §8 note says "Admin stays desktop-first." Don't worry about responsive collapse for the admin shell.
- **A scratch `/_dev/components` page** for visual smoke testing
- **ESLint rule `local/no-tailwind-classes`** to block Tailwind
