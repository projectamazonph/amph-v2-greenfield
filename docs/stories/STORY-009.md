# STORY-009 · Middleware: request container + auth gate

**Sprint:** 2
**Points:** 1
**Epic:** Auth + infrastructure
**Owner:** Ryan
**Dependencies:** STORY-008
**Status:** ✅ Done (`src/lib/auth.ts` + `src/middleware.ts` landed; see also `docs/sprint-11/UI-WIRING-PLAN.md` for the admin gating work)

## Goal

The middleware sets up the per-request DI container (ADR-017) and gates routes that require authentication. The `getSession()` helper works for any RSC, server action, or route handler. Admin routes get a second gate. After this story, every page is auth-aware and every use case can call `container.get()` to get its dependencies.

## Acceptance criteria

- [ ] `src/middleware.ts` runs on every request, sets up the request container via `container.run(buildContainer(), () => next(req))`, and gates protected routes.
- [ ] `src/lib/auth.ts` exports `getSession(): Promise<Session | null>` — reads the JWT from the cookie, verifies it, returns the session or null. Cached per request.
- [ ] `src/lib/auth.ts` exports `requireUser(): Promise<Session>` — throws redirect to `/signin?next=...` if no session.
- [ ] `src/lib/auth.ts` exports `requireAdmin(): Promise<Session>` — throws redirect to `/dashboard` if no session, throws 403 if role is not admin/super_admin.
- [ ] `(dashboard)` layout uses `requireUser()` and renders the sidebar + bottom nav.
- [ ] `admin` layout uses `requireAdmin()` and renders the admin shell.
- [ ] All server actions and RSC pages that need auth use the helpers.
- [ ] The `ip` field in the `SignUp` form is now real (read from middleware-injected request context).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `src/middleware.ts` | Create |
| `src/lib/auth.ts` | Create — `getSession`, `requireUser`, `requireAdmin` |
| `src/lib/__tests__/auth.test.ts` | Create |
| `src/app/(dashboard)/layout.tsx` | Create — uses `requireUser`, renders sidebar + bottom nav |
| `src/app/admin/layout.tsx` | Create — uses `requireAdmin` |
| `src/app/(dashboard)/dashboard/page.tsx` | Create — placeholder dashboard (real content in Sprint 6) |
| `src/app/actions/auth.ts` | Modify — `signUpAction` reads `ip` from the request context |

## Code shape

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@composition/container";
import { container } from "@composition/requestContainer";

export async function middleware(req: NextRequest) {
  return container.run(buildContainer(), () => {
    // route gating
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // requireAdmin handled in admin/layout.tsx
    }
    return NextResponse.next();
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

```ts
// src/lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { container } from "@composition/requestContainer";

const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-amph_session" : "amph_session";

export type Session = {
  userId: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  tokenVersion: number;
  expiresAt: Date;
};

let cachedSession: { key: string; session: Session | null } | null = null;

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const cacheKey = token.slice(0, 32);
  if (cachedSession?.key === cacheKey) return cachedSession.session;

  const c = container.get();
  const result = await c.tokenService.verify(token);
  if (!result.ok) {
    cachedSession = { key: cacheKey, session: null };
    return null;
  }
  const user = await c.users.findById(result.value.sub);
  if (!user || user.tokenVersion !== result.value.tokenVersion || user.deletedAt) {
    cachedSession = { key: cacheKey, session: null };
    return null;
  }
  const session: Session = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    expiresAt: new Date(result.value.exp * 1000),
  };
  cachedSession = { key: cacheKey, session: session };
  return session;
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/signin");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return session;
}
```

## Pitfalls

- **The session cache is per-request.** The `cachedSession` module-level variable is reset on every request because the module is loaded fresh. (Or, if Next.js caches modules, use `AsyncLocalStorage` to scope the cache.)
- **JWT verification is in the `TokenService` port.** The session helper composes: `tokenService.verify` + `users.findById` + `tokenVersion` check. The use case for `SignIn` did the inverse: `users.findById` + `passwordHasher.verify` + `tokenService.sign`.
- **`requireAdmin` calls `requireUser` first.** If you're not signed in, you go to `/signin`, not `/dashboard`. The redirect is a one-step hop, not two.
- **The `ip` field in `SignUp` is now real.** The middleware sets `ip` on the request context (extracted from `x-forwarded-for`), the action reads it. The form no longer sends a stub.
- **The middleware is cheap.** It does not verify the JWT (that's the `getSession` helper's job). It only sets up the container. JWT verification happens lazily in `getSession` only when a page or action actually needs the session.
- **The matcher excludes static assets.** `_next/static`, `_next/image`, `favicon.ico`. This keeps the middleware fast.

## Verification

```bash
pnpm test -- auth
# Asserts: getSession returns null for missing cookie, getSession returns null for invalid token, getSession returns session for valid token + matching tokenVersion, getSession returns null for valid token but mismatched tokenVersion

pnpm dev
# Visit /dashboard while signed out -> redirect to /signin
# Sign in, visit /dashboard -> shows placeholder dashboard
# Visit /admin while signed in as student -> redirect to /dashboard
# (Can't easily test admin gating without a STUDENT vs ADMIN user; STORY-046 covers the full admin gate)
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `getSession`, `requireUser`, `requireAdmin` work as documented.
- [ ] Middleware runs on every request except static assets.
- [ ] The `SignUp` form's `ip` is now real (from request context).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-009.md` exists (this file).
- [ ] Conventional commit: `feat(auth): middleware + getSession + requireUser + requireAdmin (STORY-009)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
