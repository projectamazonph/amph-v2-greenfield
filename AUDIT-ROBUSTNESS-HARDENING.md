# Amph-v2 Greenfield — Robustness, Hardening & Resilience Audit

**Date:** 2026-07-31  
**Scope:** Caching, error handling, null states, loading/skeleton UX, performance, points of failure, backup, outage recovery  
**Stack:** Next.js 16 App Router · React 19 · Prisma 7 + PostgreSQL · PayMongo · Resend · Sentry · Pino · Upstash Redis · Vercel

---

## Executive Summary

Amph-v2 has a **strong architectural foundation** — clean hexagonal architecture (ports/adapters), `Result<T, E>` error typing across all layer boundaries, Sentry instrumentation, Pino structured logging with secret redaction, and a proper CI pipeline with architecture compliance tests. The gaps are in **application-layer caching**, **frontend loading/empty states**, **database resilience**, and **outage recovery automation**.

| Area | Current State | Risk Level |
|------|--------------|------------|
| Error handling (backend) | ✅ Strong — Result types, Sentry, Pino | LOW |
| Error handling (frontend) | ⚠️ Only global-error.tsx, no route-level error.tsx | MEDIUM |
| Caching | ⚠️ MDX LRU only; no DB query cache, no HTTP cache headers | HIGH |
| Loading states / Skeletons | ❌ Zero skeleton components found | HIGH |
| Null/empty states | ⚠️ Minimal — mostly raw "no data" renders | MEDIUM |
| Database resilience | ⚠️ No retry, no circuit breaker, no connection pool config | HIGH |
| Backup & recovery | ❌ No automated backup strategy in repo | HIGH |
| Rate limiting | ✅ Upstash with graceful fallback | LOW |
| Observability | ✅ Sentry + Pino + Web Vitals | LOW |
| Security hardening | ✅ Strong — JWT, Argon2, HMAC webhooks, gitleaks | LOW |
| Payment resilience | ⚠️ PayMongo refund is stubbed (STORY-049.5) | MEDIUM |

---

## 1. CACHING

### What Exists
- **MDX Renderer** (`src/infra/rendering/NextMdxRenderer.ts`): Content-addressed LRU cache (SHA-1 key, 500 entry cap). Well-implemented with LRU eviction.
- **Certificate PDF route**: `Cache-Control: public, max-age=300, s-maxage=300` header.
- **Course entity**: Denormalized `curriculum` JSON field on the Course model — a read-optimized cache for lesson navigation.

### What's Missing

#### 1.1 No Application-Level DB Query Cache
Every page load hits PostgreSQL directly. For a course catalog and pricing tiers that change infrequently, this is wasteful.

**Recommendation:**
```
// Next.js unstable_cache for read-heavy, write-rare data
import { unstable_cache } from 'next/cache';

export const getCachedPricingTiers = unstable_cache(
  async () => prisma.pricingTier.findMany({ where: { active: true } }),
  ['pricing-tiers'],
  { revalidate: 300, tags: ['pricing'] }  // 5 min TTL
);
```

**Priority targets:**
- `ListPricingTiers` — changes rarely, read on every pricing page
- `ListCatalogCourses` — public catalog, changes on admin edit only
- `GetEmailTemplate` — admin-rendered, near-static

#### 1.2 No HTTP Cache Headers on API Routes
The `/api/health` endpoint returns no cache headers. Most API routes lack `Cache-Control`.

**Recommendation:** Add `Cache-Control` to public API routes:
- `/api/health` → `no-cache` (always fresh)
- Public course data → `s-maxage=60, stale-while-revalidate=300`

#### 1.3 No Next.js `revalidatePath` / `revalidateTag` on Mutations
When an admin updates a course, pricing tier, or email template, there's no cache invalidation hook. If you add `unstable_cache`, you must also add revalidation on write.

**Recommendation:** Call `revalidateTag('pricing')` in `AdminUpdateDiscountCode`, `CreateCourse`, etc.

#### 1.4 No Redis Cache Layer
Upstash Redis is already a dependency (for rate limiting). It's not used for general caching.

**Recommendation (when scale demands):** Wrap frequently-read repository methods with a Redis cache layer. Only add when DB query metrics show hot paths.

---

## 2. ERROR HANDLING

### What Exists (Strong)
- **`Result<T, E>` pattern** (`src/domain/shared/Result.ts`): Canonical sum type used across ALL port interfaces. No exceptions cross layer boundaries. Includes `map`, `flatMap`, `combine`, `unwrapOr`.
- **Discriminated error kinds**: `not_found`, `unauthorized`, `paymongo_error`, `network_error`, `rate_limiter_error`, `frontmatter_error`, `compile_error`, `internal_error`.
- **Sentry integration**: Client, server, and edge configs. `onRequestError` in `instrumentation.ts` captures every unhandled request error with path/method context.
- **PinoLogger**: Structured logging with automatic secret redaction (password, token, secret, cookie, authorization, apiKey).
- **Proxy error handling**: Invalid JWT → clear cookie + redirect. Missing JWT_SECRET → 500 (fail closed).
- **PayMongo**: HMAC-SHA256 webhook verification with timing-safe comparison and stale webhook rejection (>5 min).
- **Global error boundary**: `src/app/global-error.tsx` catches unhandled React errors and reports to Sentry.

### What's Missing

#### 2.1 No Route-Level `error.tsx` Files
Only `global-error.tsx` exists. No per-route error boundaries for `/dashboard`, `/admin`, `/courses`, `/checkout`, etc.

**Impact:** A crash in `/dashboard/progress` kills the entire dashboard instead of showing a scoped error.

**Recommendation:** Add `error.tsx` to every route segment:
```
src/app/dashboard/error.tsx    — "Something went wrong with your dashboard"
src/app/admin/error.tsx        — "Admin panel error"
src/app/courses/error.tsx      — "Could not load courses"
src/app/checkout/error.tsx     — "Checkout error — your card was NOT charged"
```

Each should:
- Show a user-friendly message
- Include a "Try Again" button (`reset()` from error boundary)
- Report to Sentry with route context
- NOT expose internal error details

#### 2.2 No `not-found.tsx` Custom Pages
No custom 404 pages found. Next.js renders a default ugly 404.

**Recommendation:** Add `src/app/not-found.tsx` and `src/app/dashboard/not-found.tsx`.

#### 2.3 PayMongo Refund is Stubbed
`PayMongoAdapter.refund()` returns `Result.err({ code: "not_implemented" })`. This means `AdminProcessRefund` and `ProcessRefund` use cases cannot actually process refunds in production.

**Risk:** If a user requests a refund, the admin has no automated path. Manual PayMongo dashboard access required.

**Action:** Prioritize STORY-049.5 (PayMongo Refunds API integration).

#### 2.4 No Retry Logic on External Calls
`PayMongoAdapter.createCheckoutSession()` and `getCheckoutSession()` have single-attempt `fetch` calls. Network blips cause immediate failure.

**Recommendation:** Add exponential backoff retry (2-3 attempts) for idempotent GET requests. POST requests should NOT be retried blindly (idempotency key required).

---

## 3. NULL STATES & EMPTY STATES

### Current State
- Use cases return `Result.err({ kind: "not_found" })` which pages handle by calling `notFound()` from Next.js.
- The `ListUsers` use case applies in-memory filters after loading — documented as acceptable for <10k users.
- No skeleton or empty state components found in `src/components/ui/`.

### What's Missing

#### 3.1 No Empty State Components
When a student has no enrollments, no badges, no certificates — there's no friendly "Get started!" empty state.

**Recommendation:** Create reusable empty state components:
```
src/components/ui/empty-state.tsx
- Icon + title + description + CTA button
- Usage: <EmptyState icon="GraduationCap" title="No courses yet" cta="Browse courses" href="/courses" />
```

**Priority pages:**
- Dashboard (no enrollments) → "Start learning! Browse our catalog"
- Admin courses list (empty) → "Create your first course"
- Certificates page (none) → "Complete a course to earn certificates"
- Badges page (none) → "Keep learning to earn badges"

#### 3.2 No Null-Safe Rendering Patterns
Several components may render `undefined` if data is missing. The `Result` pattern protects the backend, but frontend components need explicit null guards.

**Recommendation:** Audit all page components for null props. Use optional chaining and fallback UI consistently.

---

## 4. LOADING STATES & SKELETONS

### Current State
**Zero skeleton components found.** The only loading indicator is a text `"Loading…"` on the keyword research form button.

### Critical Gap
Every server component page shows a blank white screen while data loads. This is the single biggest UX issue.

**Recommendation:** Add `loading.tsx` files to every route segment:

```
src/app/dashboard/loading.tsx    — Dashboard skeleton
src/app/courses/loading.tsx      — Course catalog skeleton
src/app/admin/loading.tsx        — Admin panel skeleton
src/app/profile/loading.tsx      — Profile skeleton
```

**Skeleton components to create:**
```
src/components/ui/skeleton.tsx           — Base skeleton primitive (pulse animation)
src/components/ui/skeleton-card.tsx      — Card-shaped skeleton
src/components/ui/skeleton-table.tsx     — Table row skeleton
src/components/ui/skeleton-list.tsx      — List item skeleton
```

**Design guidelines (from UI/UX skill):**
- Use `content-visibility: auto` for long lists (CLS < 0.1)
- Skeleton pulse animation: 150-300ms duration
- Match the actual content layout exactly (same heights, widths)
- Reserve space to prevent layout shift

---

## 5. PERFORMANCE

### What Exists
- **Standalone output** (`output: 'standalone'` in next.config.ts) — self-contained production artifact
- **Prisma connection pooling** via PgBouncer-compatible connection string
- **Web Vitals reporting** (`src/lib/webVitals.ts`, `src/app/WebVitalsReporter.tsx`)
- **Lighthouse CI** (`.lighthouserc.json`, `lighthouserc.json`)
- **pnpm** with frozen lockfile for reproducible installs
- **Architecture compliance tests** enforcing SOLID, dependency direction, no circular deps

### What's Missing

#### 5.1 No Image Optimization Strategy
No `<Image>` component usage or Next.js image optimization config found. If the app serves course thumbnails or user avatars, they're unoptimized.

**Recommendation:** Configure `next/image` with appropriate `sizes`, `priority` for above-fold, and `loading="lazy"` for below-fold.

#### 5.2 No Bundle Analysis
No `@next/bundle-analyzer` configured. Bundle size is unknown.

**Recommendation:** Add bundle analysis to CI:
```json
// package.json
"analyze": "ANALYZE=true next build"
```

#### 5.3 ListUsers In-Memory Filtering
`ListUsers` loads all users then filters in memory. Documented as acceptable for <10k users but will degrade.

**Recommendation:** Add pagination + DB-level filtering before hitting 10k users. Push WHERE clauses into Prisma.

#### 5.4 No Dynamic Imports for Heavy Components
`@react-pdf/renderer` (certificate PDF), `@react-email/components`, and `marked` are likely bundled into the main chunk.

**Recommendation:** Use `next/dynamic` for:
- Certificate PDF viewer
- Email template preview
- Markdown renderer (if used client-side)

---

## 6. POINTS OF FAILURE

| Failure Point | Impact | Current Mitigation | Gap |
|--------------|--------|-------------------|-----|
| **PostgreSQL down** | ALL pages fail | Health check endpoint exists | No retry, no circuit breaker, no fallback UI |
| **PayMongo down** | Checkout fails | Result error handling | No retry, no queued retry |
| **Resend down** | Emails not sent | Result error handling | No retry queue, no dead letter |
| **Upstash Redis down** | Rate limiting fails | Graceful fallback (permissive no-op) | ✅ Good |
| **JWT_SECRET missing** | All auth fails | Proxy returns 500 (fail closed) | ✅ Good |
| **DATABASE_URL missing** | App won't start | Throws at startup | ✅ Good |
| **Vercel outage** | Entire app down | None | No multi-region, no failover |
| **Prisma migration failure** | DB schema mismatch | CI runs `prisma migrate deploy` | No rollback automation |

### Critical: No Database Connection Resilience

The Prisma client (`src/infra/database/prisma.ts`) creates a raw `pg.Pool` with no configuration:

```ts
const pool = new Pool({ connectionString });  // ALL defaults
```

**Recommendation:**
```ts
const pool = new Pool({
  connectionString,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Fail fast on connection timeout
});
```

---

## 7. BACKUP & RECOVERY

### Current State: ❌ No Backup Strategy in Repo

There's no:
- Database backup script or cron
- Point-in-time recovery configuration
- Backup verification process
- Disaster recovery runbook

### Recommendations

#### 7.1 Database Backups
For Vercel Postgres (if using): automatic daily backups with 7-day retention are built-in.

For self-managed PostgreSQL:
```bash
# Add to CI/cron
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
# Upload to S3/R2 with lifecycle policy
```

#### 7.2 Prisma Migration Rollback
Every migration should have a documented rollback path. The `prisma migrate deploy` command is forward-only.

**Recommendation:** Add a `scripts/rollback-migration.sh` that takes a migration name and runs the down migration.

#### 7.3 Disaster Recovery Runbook
Create `docs/RUNBOOK.md` covering:
1. Database restore from backup
2. Vercel rollback to previous deployment
3. Emergency secret rotation
4. PayMongo webhook replay
5. User communication templates

---

## 8. OUTAGE RECOVERY

### What Exists
- **Health endpoint** (`/api/health`): Returns 200 with DB latency or 503 on DB failure
- **Sentry alerting**: Captures unhandled errors with request context
- **CI/CD pipeline**: 5 parallel jobs (quality, architecture, unit, e2e, build) with proper dependency gates
- **Dependabot**: Configured for automated dependency updates

### What's Missing

#### 8.1 No Uptime Monitoring
No external uptime monitor (UptimeRobot, BetterStack, etc.) configured in the repo.

**Recommendation:** Add an external monitor hitting `/api/health` every 60 seconds.

#### 8.2 No Webhook Replay / Idempotency
PayMongo webhooks are verified but there's no idempotency check. If PayMongo retries a webhook (common), the same payment could be processed twice.

**Recommendation:** Use the `PrismaWebhookEventLog` that already exists — check `eventId` before processing.

#### 8.3 No Graceful Degradation
When PayMongo is down, the checkout page shows an error. There's no "try again later" or queued checkout.

**Recommendation:** Show a clear message: "Payment system is temporarily unavailable. Your cart is saved — try again in a few minutes."

#### 8.4 No Deployment Rollback Automation
CI builds standalone artifacts but there's no one-click rollback script.

**Recommendation:** Document `vercel rollback` in the runbook. Consider adding a GitHub Actions workflow for manual rollback.

---

## 9. SECURITY HARDENING (Already Strong)

### What's Working Well
- ✅ Argon2 password hashing
- ✅ JWT with Jose (Web Crypto)
- ✅ HttpOnly + Secure + SameSite cookies
- ✅ HMAC-SHA256 webhook verification with timing-safe comparison
- ✅ Stale webhook rejection (5 min)
- ✅ Gitleaks secret scanning in CI
- ✅ Security headers via proxy (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ Rate limiting via Upstash with graceful fallback
- ✅ TOTP 2FA support
- ✅ Session revocation (server-side session check after JWT verify)
- ✅ `server-only` import guard preventing server code in client bundles

### Minor Gaps
- No CSP (Content-Security-Policy) header — consider adding
- No rate limiting on login/signup API routes specifically (global limiter only)
- `InMemoryRateLimiter` exists for tests — confirm it's never used in production container

---

## 10. PRIORITIZED ACTION PLAN

### P0 — Do Now (Blocks Production Readiness)
1. **Add route-level `error.tsx`** to `/dashboard`, `/admin`, `/courses`, `/checkout`
2. **Add `loading.tsx`** with skeleton UI to every route segment
3. **Configure pg.Pool** with connection limits and timeouts
4. **Add webhook idempotency** check using `PrismaWebhookEventLog`

### P1 — Do This Sprint
5. **Create empty state components** for dashboard, courses, certificates, badges
6. **Add custom `not-found.tsx`** pages
7. **Add `unstable_cache`** for pricing tiers and catalog courses
8. **Add retry logic** (2-3 attempts with backoff) to PayMongo GET requests
9. **Implement PayMongo refunds** (STORY-049.5)

### P2 — Do This Month
10. **Add database backup automation** (cron or Vercel Postgres)
11. **Create disaster recovery runbook** (`docs/RUNBOOK.md`)
12. **Add external uptime monitoring** for `/api/health`
13. **Add CSP header** to proxy
14. **Bundle analysis** in CI

### P3 — Backlog
15. **Dynamic imports** for heavy components (PDF, email preview)
16. **Redis caching layer** for hot DB queries (when scale demands)
17. **Image optimization** with `next/image`
18. **ListUsers DB-level filtering** before 10k users

---

## Architecture Strengths to Preserve

These are working well — don't break them:

1. **Hexagonal architecture** (ports/adapters) — clean separation, testable
2. **Result<T, E> everywhere** — no exceptions across boundaries
3. **Composition root** (single `container.ts`) — clean DI
4. **In-memory test doubles** — fast unit tests without DB
5. **Architecture compliance tests** — enforces SOLID in CI
6. **`server-only` guards** — prevents server code leaking to client
7. **AsyncLocalStorage** for request-scoped containers
8. **Lazy initialization** in PinoLogger and UpstashRateLimiter (builds don't crash without env vars)

---

*Generated from deep analysis of 200+ source files across domain, infra, ports, usecases, app, and composition layers.*
