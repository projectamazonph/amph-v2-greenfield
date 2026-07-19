# STORY-047: Admin users list + user detail + impersonate

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-046 (admin shell + dashboard), STORY-046-prep-1/2/3
**Blocks:** STORY-048, STORY-049, STORY-050 (all admin pages assume user list/detail UX)

## Goal

Ship the first interactive admin page after the dashboard:

- **`/admin/users`** — paginated, searchable list of all users. Columns: name, email, role, subscription tier, created date. Filters: role (STUDENT/INSTRUCTOR/ADMIN), subscription tier (FREE/STARTER/PRO), search by name/email.
- **`/admin/users/[id]`** — user detail page. Shows: profile, role, tier, created at, total XP, enrolled course count, last sign-in (TODO if not available), and a list of the user's enrollments.
- **Impersonate button** on the user detail page. Admin clicks "Impersonate" → server action plants a session cookie for the target user → admin is redirected to `/dashboard` as that user. A persistent banner at the top of every page shows "You are impersonating [name]. [Stop impersonating]" until the admin stops.

## Why

Admins need to find users, see their state, and debug their experience. Impersonation is the single most useful support tool — it lets an admin reproduce what a user is seeing without asking them to share their screen or password. Every other admin page (STORY-048+ courses, STORY-049 payments, etc.) will reuse the user detail pattern.

## Acceptance Criteria

- [ ] `src/usecases/ListUsers.ts` — use case returning paginated, filtered users
  - Input: `{ search?: string; role?: Role; subscriptionTier?: SubscriptionTier; page?: number; pageSize?: number }`
  - Output: `{ users: readonly User[]; totalCount: number; page: number; pageSize: number }`
  - Default page size: 25
- [ ] `src/usecases/__tests__/ListUsers.test.ts` — tests for:
  - Returns all users when no filters
  - Filters by role
  - Filters by subscription tier
  - Filters by search (case-insensitive substring match on firstName, lastName, email)
  - Paginates correctly (skip + take)
  - Combines filters (search + role + tier)
  - Returns empty list with totalCount=0 when no matches
  - Page beyond last → empty users but correct totalCount
- [ ] `src/usecases/GetUserDetail.ts` — use case returning a user with their enrollment count
  - Input: `{ userId: string }`
  - Output: `{ user: User; enrollmentCount: number }`
  - Returns `user_not_found` if the user doesn't exist
- [ ] `src/usecases/__tests__/GetUserDetail.test.ts` — tests for happy path, user not found, enrollment count from repo
- [ ] `src/usecases/ImpersonateUser.ts` — use case (orchestrator)
  - Input: `{ targetUserId: string; adminUserId: string }`
  - Flow: verify target exists, generate a fresh session JWT for the target, return `{ token, expiresAt }`
  - Does NOT touch the session cookie itself (that's the server action's job)
  - Returns `target_user_not_found` if the target doesn't exist
  - Returns `cannot_impersonate_admin` if the target is an ADMIN (admins shouldn't impersonate other admins — this is a privilege separation; it also prevents lockout)
- [ ] `src/usecases/__tests__/ImpersonateUser.test.ts` — tests for happy path, target not found, target is admin (rejected), token shape, expiresAt
- [ ] `src/app/actions/impersonateUser.action.ts` — server action (5-line thin shell)
  - Calls `requireAdmin()` to verify the caller is an admin
  - Calls `container.impersonateUser.execute({ targetUserId, adminUserId: user.id })`
  - Plants the returned token as the session cookie via `setAuthCookie()`
  - `redirect("/dashboard")` so the admin lands on the user's view
  - Wrapped in `performImpersonateUser()` helper for testability
- [ ] `src/app/actions/stopImpersonating.action.ts` — server action
  - Re-plants the original admin's session cookie (we need to keep the pre-impersonation token somewhere — stored in a separate cookie `amph_admin_session`)
  - `redirect("/admin")` to bring the admin back
- [ ] `src/app/admin/users/page.tsx` — server component
  - Reads `searchParams` (Next 15 async params: `await searchParams`) for filter state
  - Calls `container.listUsers.execute(...)`
  - Renders a table (10 rows per page) with: avatar (initials), full name, email, role badge, tier badge, created date
  - Above the table: search input + role filter + tier filter (forms that update the URL searchParams)
  - Below: pagination (Prev / page X of Y / Next)
- [ ] `src/app/admin/users/[id]/page.tsx` — server component
  - Calls `container.getUserDetail.execute({ userId })`
  - Renders: profile section (avatar, name, email, role, tier, createdAt, totalXp), enrolled course count, enrollment list
  - "Impersonate" button (form posting to the impersonate action)
  - Back link to `/admin/users`
- [ ] `src/app/admin/users/[id]/__tests__/page.test.tsx` — tests for:
  - Renders user details
  - Renders enrollment count
  - Renders the impersonate button
  - Returns "not found" UI when user doesn't exist
  - Static-analysis guard: does NOT use `new InMemoryUserRepository`
- [ ] `src/composition/container.ts` — add `listUsers`, `getUserDetail`, `impersonateUser` to the AppContainer
- [ ] `src/composition/container.test.ts` — add wiring tests (use case is defined, renderer/renderCertificatePdf-style assertions)
- [ ] `src/app/(dashboard)/layout.tsx` (or root layout) — add the impersonation banner
  - Reads the `amph_admin_session` cookie
  - If present, fetches the admin user and renders a sticky top banner: "You are impersonating [target name] ([target email]). [Stop impersonating]"
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 970 + new tests passing
- [ ] `pnpm build` succeeds (or `tsc + vitest` if the pre-existing `InMemoryEmailSender` build break still exists)

## Files to Create

```
src/usecases/
├── ListUsers.ts
├── GetUserDetail.ts
├── ImpersonateUser.ts
└── __tests__/
    ├── ListUsers.test.ts
    ├── GetUserDetail.test.ts
    └── ImpersonateUser.test.ts

src/app/admin/users/
├── page.tsx
├── page.module.css
├── [id]/
│   ├── page.tsx
│   ├── page.module.css
│   └── __tests__/
│       └── page.test.tsx
└── __tests__/
    └── page.test.tsx  (optional, may be skipped per #Pitfalls)

src/app/actions/
├── impersonateUser.action.ts
└── stopImpersonating.action.ts

src/components/admin/
└── ImpersonationBanner.tsx
```

## Files to Read

- `src/ports/repositories/UserRepository.ts` (has `listAll`, `findById`; may need a `findEnrollmentsByUserId`)
- `src/ports/repositories/IEnrollmentRepository.ts` (has `findByUserId`)
- `src/usecases/SignUp.ts` (for the audit-log TODO pattern)
- `src/app/admin/page.tsx` (for the page composition pattern)
- `src/app/actions/revokeCertificate.action.ts` (for the pure-helper + thin-shell pattern)
- `src/lib/auth.ts` (`requireAdmin`, `setAuthCookie`, `getSessionUser`)
- `docs/ui-specs/DESIGN-SPEC.md` §10 (admin tables + filters pattern)
- `docs/ui-specs/refs/admin-users-page.tsx` (parent's real admin users list, for reference)

## Code Shape (sketch)

```ts
// src/usecases/ListUsers.ts
export interface ListUsersInput {
  search?: string;
  role?: Role;
  subscriptionTier?: SubscriptionTier;
  page?: number;     // 1-indexed
  pageSize?: number; // default 25
}

export type ListUsersError = { kind: "db_error"; message: string };

export type ListUsersResult = Result<
  {
    users: readonly User[];
    totalCount: number;
    page: number;
    pageSize: number;
  },
  ListUsersError
>;

export interface ListUsersDeps {
  userRepo: UserRepository;
}

export class ListUsers {
  constructor(private readonly deps: ListUsersDeps) {}
  async execute(input: ListUsersInput): Promise<ListUsersResult> {
    // 1. Load all users from repo (small app, no pagination at DB level)
    // 2. Apply filters in-memory
    // 3. Slice for the page
    // 4. Return { users, totalCount, page, pageSize }
  }
}
```

```ts
// src/usecases/ImpersonateUser.ts
export interface ImpersonateUserInput {
  targetUserId: string;
  adminUserId: string;
}

export type ImpersonateUserError =
  | { kind: "target_user_not_found" }
  | { kind: "cannot_impersonate_admin" }
  | { kind: "admin_user_not_found" }
  | { kind: "db_error"; message: string };

export type ImpersonateUserResult = Result<
  { token: string; expiresAt: Date; targetUser: User },
  ImpersonateUserError
>;

export interface ImpersonateUserDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository; // for issuing a fresh session row
  jwt: JwtService;
  clock: Clock;
  idGen: IdGenerator;
}
```

## Pitfalls

- **"Admins impersonating admins"** — reject. If an admin impersonates another admin, you can get a lockout scenario (admin1 impersonates admin2, admin2 stops impersonating, but admin1's cookie is now admin2's). The rule is: admins can impersonate STUDENT and INSTRUCTOR only.
- **"Audit log"** — AGENTS.md says every admin action logs. There's no AuditLog port yet (SignUp has a TODO). For this story, log via `console.log` with a clear `[impersonate]` prefix and a TODO comment. AuditLog is a separate story.
- **"Pre-existing build break in `InMemoryEmailSender`"** — not introduced by this story. `tsc + vitest` remain the working quality gates.
- **"Search is case-insensitive"** — convert both query and field to lowercase before substring match. Don't use SQL `LIKE` (we're in-memory).
- **"Pagination beyond last page"** — return empty `users` but correct `totalCount`. Don't throw.
- **"Impersonation cookie lifecycle"** — the original admin cookie is preserved in `amph_admin_session`. The impersonation cookie is `amph_session` (same name as the real one). When the admin clicks "Stop impersonating", restore the original cookie.
- **"Server actions need a CSRF-safe form"** — the impersonate button is a server-action form. Next.js handles CSRF for server actions out of the box. No special config needed.
- **"Stat tile / table components"** — the design system has `Card` and `Badge`. For tables, use plain `<table>` with the Field Manual density (12px padding, 13px font, JetBrains Mono for numerics). No need for a Table component yet.
- **"Impersonation banner on every page"** — add it in the dashboard layout, not the root layout (admin doesn't see it). The banner reads `amph_admin_session` cookie; if present, shows the impersonation state.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-please" \
  pnpm vitest run
```

Manual smoke (in a follow-up, not this PR):
- Sign in as an admin user (set the cookie via DevTools or a seed script)
- Visit `/admin/users` — see the list
- Click a user — see the detail page
- Click "Impersonate" — redirected to `/dashboard` as that user
- See the banner at the top
- Click "Stop impersonating" — back to admin
- Sign out → visit `/admin/users` → redirected to `/login`

## Out of scope

- **STORY-048+** (admin courses, payments, etc.) — each is its own 1-pt story
- **Real-time updates** (admin sees a new user's signup live) — future
- **Bulk actions** (select multiple users, suspend, etc.) — future
- **CSV export** of the users list — future
- **AuditLog port + persistent audit log table** — separate story (closes the AGENTS.md "every admin action logs" promise properly)
- **Last sign-in tracking** — requires schema change; deferred
- **User impersonation audit trail** — out of scope without the AuditLog port
