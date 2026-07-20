# STORY-046-prep-2: `src/lib/auth.ts` — session helpers for server components and actions

**Sprint:** 10 (prep)
**Points:** 1
**Epic:** UI foundation
**Depends on:** STORY-046-prep-1 (no, actually depends on existing `JoseJwtService` from STORY-013)
**Blocks:** STORY-046, STORY-047 (admin users list), any future page that needs to know who's logged in
**Status:** ✅ Done (initial greenfield bootstrap; `src/lib/auth.ts` is the canonical session helper)

## Goal

Create `src/lib/auth.ts` exposing server-side session helpers that page components, layouts, and server actions can call without re-implementing the cookie → JWT verify → user lookup dance. Includes the `requireAuth` / `requireAdmin` guards that the design spec calls for in §9.

## Why

The current state of auth in the greenfield:

- `src/middleware.ts` already verifies the JWT and sets `x-amph-user-id` / `x-amph-session-id` / `x-amph-role` headers on the request.
- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` has a `getCurrentUserId()` helper that **returns `null` and has a `// TODO (STORY-006)` comment** — pages can't actually know who's logged in today.
- `src/infra/security/JoseJwtService.ts` is a clean port-and-adapter (port `JwtService` + adapter), and the existing `PrismaUserRepository` provides user lookup.
- What's missing is the **glue**: a thin `src/lib/auth.ts` that pages and server actions can import. The pattern is borrowed from the parent `amph-v2`'s `src/lib/auth.ts` (see `docs/ui-specs/refs/`), but adapted for the greenfield's existing `JoseJwtService` (the parent uses scrypt+jose directly).

This prep is **the single most important gate** for STORY-046. Without it, every admin page would either re-implement the cookie-read + JWT-verify + user-fetch loop, or rely on the broken `getCurrentUserId` stub.

## Acceptance Criteria

- [ ] `src/lib/auth.ts` exports:
  - `getSessionUserId(): Promise<string | null>` — reads cookie, verifies JWT, returns user ID. Returns null on missing/invalid cookie. **Replaces the broken `getCurrentUserId` in the lesson page.**
  - `getSessionUser(): Promise<User | null>` — same as above, then fetches the user via `userRepo.findById()`. Returns null if cookie invalid OR user no longer exists in DB.
  - `requireAuth(): Promise<User>` — like `getSessionUser` but throws a `RedirectError` (caught by the page) or `redirect('/login?redirect=...')` if not authenticated.
  - `requireAdmin(): Promise<User>` — like `requireAuth` but additionally checks `user.role === 'ADMIN'`. Throws / redirects if not.
  - `setAuthCookie(token: string, expiresAt: Date): Promise<void>` — sets `amph_session` (or `__Secure-amph_session` in prod). Called by SignIn server action.
  - `clearAuthCookie(): Promise<void>` — deletes both cookie names. Called by SignOut server action.
- [ ] `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` is updated to import `getSessionUserId` from `@/lib/auth` and the local `getCurrentUserId` helper is deleted
- [ ] Unit tests for all helpers at `src/lib/__tests__/auth.test.ts` (use `vi.hoisted` to mock `next/headers` cookies, same pattern as `src/app/api/webhooks/paymongo/__tests__/route.test.ts`)
- [ ] Existing `getCurrentUserId` consumers are unaffected (no breaking change beyond the lesson page which is updated in this PR)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` 728+passing (existing 728 + new tests)
- [ ] Documented gap: the **SignIn and SignOut use cases** (STORY-006 in the greenfield's sprint plan) still need to exist for `setAuthCookie` and `clearAuthCookie` to be called. This prep adds the helpers; STORY-006 wires them into the signin flow. Without STORY-006, no cookie is set after signup — this is a known pre-existing gap that this story does not fix.

## Files to Create / Modify

- `src/lib/auth.ts` (new) — the helpers
- `src/lib/__tests__/auth.test.ts` (new) — tests
- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` (modify) — use the new helper, delete the stub

## Files to Read

- `src/middleware.ts` (sets `x-amph-user-id` etc. headers — but pages can't read those; we have to verify the cookie again at the page level, which is the standard Next pattern)
- `src/ports/security/JwtService.ts` (port for JWT sign/verify)
- `src/infra/security/JoseJwtService.ts` (the implementation)
- `src/ports/repositories/UserRepository.ts` (for `findById`)
- `src/domain/entities/User.ts` (the entity shape)
- `docs/ui-specs/refs/` — parent repo's `src/lib/auth.ts` for the pattern (the greenfield's version is cleaner because the SOLID port-and-adapter is already in place)

## Code shape

```ts
// src/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Result } from "@/domain/shared/Result";
import type { User, Role } from "@/domain/entities/User";
import type { JwtService } from "@/ports/security/JwtService";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildContainer } from "@/composition/container";

const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Secure-amph_session"
  : "amph_session";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Read and verify the session cookie. Returns the user ID if valid, null otherwise.
 *
 * Re-verifies the JWT at the page level even though middleware already verified
 * it — this is the standard Next pattern: middleware verifies for routing decisions,
 * pages verify again for data access. The JWT is in a signed HttpOnly cookie, so the
 * verification is cheap and the duplication is by design.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const container = buildContainer();
  const jwt = container.jwt; // see "Code shape note" below
  const result = await jwt.verify(token);
  if (!result.ok) return null;

  const sub = result.value.sub;
  return typeof sub === "string" ? sub : null;
}

/**
 * Read the session cookie and load the full User entity.
 * Returns null if not authenticated OR the user no longer exists.
 */
export async function getSessionUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const container = buildContainer();
  const result = await container.userRepo.findById(userId);
  if (!result.ok) return null;
  return result.value;
}

/**
 * Page-level guard: require an authenticated user.
 * Redirects to /login (preserving the current path) if not authenticated.
 */
export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    const redirectTo = "/login"; // (could be enriched with current path)
    redirect(redirectTo);
  }
  return user;
}

/**
 * Page-level guard: require an admin user.
 * Redirects to /login if not authenticated, /dashboard (or a 403 page) if not admin.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

/**
 * Set the session cookie. Called by the SignIn server action.
 */
export async function setAuthCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Clear the session cookie. Called by the SignOut server action.
 */
export async function clearAuthCookie(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  // Also clear the alt name in case the user signed in under a different env
  cookies().delete(
    process.env.NODE_ENV === "production" ? "amph_session" : "__Secure-amph_session",
  );
}
```

**Code shape note:** the `container.jwt` accessor above assumes `AppContainer` grows a `jwt: JwtService` field. Since `buildContainer()` already instantiates a `JoseJwtService` (or its test fake) per-request, this is a one-line addition. The SignIn use case will also use it to sign the token.

## Pitfalls

- **`next/headers` is request-scoped** — `cookies()` only works in server components, layouts, route handlers, and server actions. Calling it from a client component throws. `import "server-only"` at the top of `src/lib/auth.ts` catches this at build time.
- **`redirect()` throws** — it's a special Next.js mechanism that throws a `NEXT_REDIRECT` error. The `requireAuth` / `requireAdmin` functions look like they "return a User" but the redirect happens mid-function via throw. The TypeScript signature `Promise<User>` is technically a lie — but Next's `redirect()` has a return type of `never`, so TypeScript will infer the function as `Promise<User | never>` which is structurally correct.
- **The middleware already verifies the JWT** — pages verify again. This is not a bug; it's the standard Next pattern. Middleware runs on the Edge and makes routing decisions (redirect to /login if no cookie). Pages re-verify to get the user ID for data access. Yes, the JWT verify is duplicated; yes, this is intentional.
- **Session JWT is not persisted in `Session` table** — the current greenfield `SignUp` use case doesn't create a session record. Without a `sessions` table row, a logout-everywhere action (`deleteAllForUser`) has nothing to delete. **This is out of scope** for prep-2; it's a future story that wires the session record into SignIn/SignOut.
- **`buildContainer()` in the page** — pages already call `buildContainer()` to access use cases (e.g., `container.listUserBadges.execute()`). Calling it twice in the same request (once in `getSessionUserId`, once in the page) is fine because the container is a singleton — `buildContainer()` returns the cached production container on the second call.
- **`getCurrentUserId` was per-page** — moving it to `src/lib/auth.ts` means importing in the lesson page. Watch for circular imports: `src/lib/auth.ts` imports `src/composition/container.ts`, and the page imports both. Both should be fine since the page is consumed (not consumed by) the lib.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run src/lib/__tests__/auth.test.ts
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run    # full suite, 728+ passing
```

Manual smoke test (in a follow-up, not this PR):
- Sign up a user → cookie is NOT set (because `SignIn` use case doesn't exist yet; this is a known gap)
- Manually set the cookie in DevTools to a valid JWT → visit `/dashboard` → should render with the user's name in the topbar
- Visit `/admin/users` → should redirect to `/login` (not admin) OR to `/dashboard?error=forbidden` (signed in as student)

## Out of scope

- **SignIn and SignOut use cases** (greenfield STORY-006). These are needed for the cookie to be set after login. Prep-2 adds the helpers; STORY-006 (still to be written) wires them into the flow.
- **Refresh tokens / sliding sessions**. The current `Session` entity doesn't support refresh; out of scope.
- **Session persistence in `sessions` table**. The cookie is stateless (JWT only). A future story can add server-side session rows for logout-everywhere and audit logging.
- **The pre-existing build break** in `src/infra/email/InMemoryEmailSender` (STORY-045 carry-over). Not in scope.

## Related

- Parent pattern: `docs/ui-specs/refs/` (the parent's `src/lib/auth.ts` uses scrypt directly; we use the existing `JoseJwtService` port instead)
- Design spec: `docs/ui-specs/DESIGN-SPEC.md` §9.1 (admin sidebar pattern, which uses `requireAdmin()`)
- Sprint plan: STORY-006 (SignIn/SignOut) and STORY-046 (admin layout) both depend on this prep
