# AMPH v2 — Auth & Security Audit + OAuth Plan of Action

**Date:** 2026-07-31  
**Scope:** Full codebase security audit, OAuth integration plan (Google/Facebook), attack surface reduction  
**Project:** Amazon PH Academy v2 — Next.js 16 / PostgreSQL / Prisma  
**Auditor:** Automated review cross-referencing codebase against OWASP Top 10 (2025), Next.js security best practices, and installed skill knowledge bases

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Security Posture](#2-current-security-posture)
3. [Vulnerability Audit Findings](#3-vulnerability-audit-findings)
4. [OAuth Integration Plan (Google + Facebook)](#4-oauth-integration-plan)
5. [Security Hardening Recommendations](#5-security-hardening-recommendations)
6. [CI/CD Security Audit](#6-cicd-security-audit)
7. [Prioritized Action Plan](#7-prioritized-action-plan)
8. [Environment Variable Additions](#8-environment-variable-additions)
9. [Testing Strategy](#9-testing-strategy)
10. [References](#10-references)

---

## 1. Executive Summary

The AMPH v2 codebase demonstrates **strong foundational security** — clean architecture with dependency inversion, Argon2id password hashing, JWT sessions via Jose, HttpOnly/Secure/SameSite cookies, server-side session revocation, Upstash rate limiting, TOTP 2FA for admins, gitleaks in CI, and security headers in the Next.js proxy.

**Critical gaps to address:**
- No OAuth/social login — the only auth path is email/password
- Missing Content-Security-Policy (CSP) header
- Missing Strict-Transport-Security (HSTS) header
- No CSRF token mechanism for server actions (relying solely on SameSite=Lax)
- Action items tagged `userId: "system"` in simulator flows (data integrity)
- Admin 2FA is opt-in with no enforcement path
- Proxy does not check `lockedUntil` / `disabled` user status

---

## 2. Current Security Posture

### 2.1 What's Already Done Well

| Area | Implementation | Status |
|------|---------------|--------|
| Password hashing | Argon2id with configurable params via `Argon2PasswordHasher` | ✅ Strong |
| Session tokens | Jose JWT, Web Crypto, `sub` + `sessionId` + `role` claims | ✅ Strong |
| Cookie security | `httpOnly`, `secure` (prod), `sameSite=lax`, `__Secure-` prefix | ✅ Strong |
| Session revocation | DB lookup via `SessionRepository.findById()` in `getSessionUserId()` | ✅ Strong |
| Rate limiting | Upstash Redis on signup, login, checkout actions | ✅ Good |
| Security headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` | ✅ Good |
| Admin gate | `requireAdmin()` checks role, separate `/admin-login` route | ✅ Good |
| Admin 2FA | TOTP via `otpauth` library, opt-in at `/admin/settings` | ✅ Good |
| Secret scanning | `gitleaks` in CI with `.gitleaks.toml` config | ✅ Good |
| Audit logging | `RecordAuditLog` use case + `PrismaAuditLog` for admin mutations | ✅ Good |
| Architecture enforcement | ESLint boundary rules, architecture compliance test suite | ✅ Excellent |
| Input validation | Server actions parse and validate via use cases | ✅ Good |
| `server-only` import | Auth helpers use `import "server-only"` to prevent client leakage | ✅ Good |

### 2.2 What's Missing or Weak

| Area | Issue | Risk |
|------|-------|------|
| OAuth / social login | Email/password only — no Google, Facebook, etc. | UX friction, higher drop-off |
| Content-Security-Policy | No CSP header in `proxy.ts` | XSS mitigation gap |
| HSTS | No `Strict-Transport-Security` header | SSL stripping risk |
| CSRF protection | No explicit CSRF tokens; relies on SameSite=Lax only | Medium risk for state-changing POSTs |
| Account lockout | `lockedUntil` field exists but proxy/auth doesn't check it | Disabled users can still use valid JWTs |
| Email enumeration | Login/signup error messages may reveal whether email exists | Information disclosure |
| Admin 2FA enforcement | Opt-in only; no policy to require it for admin role | Compliance gap |
| Simulator ownership | `userId: "system"` on graded actions | Data integrity |
| Webhook idempotency | PayMongo webhook records events but no duplicate check visible | Replay risk |
| Password strength | No visible minimum complexity beyond Argon2 | Weak passwords allowed |

---

## 3. Vulnerability Audit Findings

### [HIGH-1] Missing Content-Security-Policy (CSP) Header

**Location:** `src/proxy.ts`  
**Impact:** Without CSP, any XSS vulnerability can freely exfiltrate data or inject arbitrary scripts.  
**Fix:** Add a strict CSP directive in the proxy. Next.js 16 supports `nonce`-based CSP:

```ts
// In proxy.ts, add to security headers:
const nonce = crypto.randomUUID();
res.headers.set(
  "Content-Security-Policy",
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Required for Next.js CSS-in-JS
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.paymongo.com https://api.resend.com https://*.sentry.io https://*.upstash.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
);
res.headers.set("x-nonce", nonce); // For downstream use
```

### [HIGH-2] Missing HSTS Header

**Location:** `src/proxy.ts`  
**Impact:** Without HSTS, browsers can be tricked into connecting over HTTP (SSL stripping).  
**Fix:**

```ts
res.headers.set(
  "Strict-Transport-Security",
  "max-age=63072000; includeSubDomains; preload"
);
```

### [HIGH-3] Account Lockout Not Enforced at Auth Layer

**Location:** `src/lib/auth.ts`, `src/proxy.ts`  
**Impact:** A user with `lockedUntil` set or `disabled=true` can continue using a valid JWT until it expires. Session revocation only checks if the `Session` record exists, not if the user account is in good standing.  
**Fix:** In `getSessionUserId()` and `getSessionUser()`, after verifying the JWT and session, also load the user and check:

```ts
if (user.lockedUntil && user.lockedUntil > new Date()) return null;
if (user.disabled) return null;
```

### [MEDIUM-1] No CSRF Token for Server Actions

**Location:** All `src/app/actions/*.ts`  
**Impact:** While SameSite=Lax cookies provide baseline CSRF protection, an attacker who can initiate a top-level navigation (e.g., via a link) can trigger GET-based state changes. Server actions that mutate state on POST are protected by Next.js's built-in action encryption, but explicit double-submit or synchronizer tokens add defense-in-depth.  
**Recommendation:** Next.js 16 server actions already have built-in CSRF protection via encrypted action IDs. Verify this is enabled. For API route handlers (webhooks), ensure signature verification is active — PayMongo webhook signature check is implemented.

### [MEDIUM-2] Email Enumeration in Auth Flows

**Location:** Login, signup, password reset flows  
**Impact:** Different error messages for "email not found" vs "wrong password" allow attackers to enumerate valid email addresses.  
**Fix:** Return identical error responses for both cases:

```ts
// Generic message for both cases:
"Invalid email or password. Please try again."
```

For password reset, always show "If an account exists with that email, a reset link has been sent."

### [MEDIUM-3] Proxy Doesn't Verify User Still Exists / Not Disabled

**Location:** `src/proxy.ts` — JWT verification succeeds without loading user  
**Impact:** The proxy only verifies JWT signature + expiry. It doesn't check if the user account has been deleted, suspended, or locked between when the JWT was issued and when the request arrives. The page-level `getSessionUser()` does load the user, so the real data is protected, but the proxy-level `x-amph-user-id` header can be stale.  
**Fix:** This is acceptable as a performance trade-off if downstream handlers always re-verify. Document this explicitly. The proxy is for routing only; data access must go through `requireAuth()`/`requireAdmin()`.

### [MEDIUM-4] Admin 2FA Not Enforced

**Location:** Admin auth flow  
**Impact:** Admin accounts can operate without 2FA. For a platform handling payments and student PII, this is a compliance gap.  
**Fix:** After the OAuth work, add an admin policy check: if `role === 'ADMIN' && !twoFactorEnabled`, redirect to `/admin/settings/2fa-setup` on every admin route access. Make it an admin-only policy (not student-facing) to avoid friction.

### [LOW-1] Simulator Actions Owned by "system"

**Location:** Graded simulator actions (bid-elevator, str-triage, campaign-builder, listing-audit)  
**Impact:** Not a security vulnerability per se, but a data integrity issue — scores aren't attributable to users.  
**Fix:** Wire `userId` from session claims into the simulator use cases.

### [LOW-2] No Rate Limiting on Password Reset

**Location:** Password reset flow  
**Impact:** An attacker can spam password reset emails, causing email cost and user annoyance.  
**Fix:** Wire the Upstash rate limiter to the password reset action (same pattern as login/signup).

### [INFO-1] `.env.example` Missing OAuth Variables

Not yet needed but will be required after OAuth implementation.

### [INFO-2] `.gitleaks.toml` — Verify Allowlist Doesn't Exclude Real Secrets

The gitleaks config at `.gitleaks.toml` should be reviewed to ensure the allowlist only excludes test/dummy values, not production secret patterns.

---

## 4. OAuth Integration Plan (Google + Facebook)

### 4.1 Architecture Decision

**Recommended approach:** Use **NextAuth.js v5 (Auth.js)** as the OAuth layer, integrated alongside the existing custom JWT session system.

**Why NextAuth.js:**
- Native Next.js 16 App Router support
- Handles the full OAuth 2.0 + OIDC dance (authorization code flow, PKCE, token exchange)
- Built-in CSRF protection, secure state handling, PKCE for public clients
- Supports Google and Facebook providers out of the box
- Can be configured to issue custom JWTs compatible with your existing `amph_session` cookie format
- Maintained by the Next.js core team

**Why NOT roll your own OAuth:**
- OAuth has many subtle security requirements (state parameter, PKCE, nonce, token replay, redirect URI validation)
- Callback handling must be exact — a single mistake = account takeover
- Token refresh, token storage, and provider-specific quirks are non-trivial

### 4.2 Architecture Fit

The five-layer architecture requires OAuth to be implemented as follows:

```
domain/
  └── entities/User.ts         ← Add optional `oauthProvider`, `oauthId` fields

ports/
  └── auth/
      └── OAuthProvider.ts     ← Interface: `getAuthorizationUrl()`, `handleCallback()`
      └── AccountLinker.ts     ← Interface: `linkOAuthToExistingUser()`, `createUserFromOAuth()`

usecases/
  ├── OAuthSignIn.ts           ← Orchestrates: exchange code → get profile → find/link/create user → issue session
  └── LinkOAuthAccount.ts      ← For existing users to add Google/Facebook to their account

infra/
  └── auth/
      ├── NextAuthProvider.ts   ← Implements OAuthProvider using Auth.js
      ├── GoogleOAuthProvider.ts
      └── FacebookOAuthProvider.ts

app/
  └── api/auth/[...nextauth]/
      └── route.ts             ← NextAuth route handler

composition/
  └── container.ts             ← Wire OAuth providers
```

### 4.3 Database Schema Changes

```prisma
// Add to User model:
model User {
  // ... existing fields ...
  oauthProvider   String?    // "google" | "facebook" | null (null = email/password)
  oauthId         String?    // Provider-specific user ID
  avatarUrl       String?    // Profile picture from OAuth provider
  
  @@unique([oauthProvider, oauthId])
}

// New AccountLink model for multi-provider linking:
model AccountLink {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // "google" | "facebook" | "credentials"
  providerId   String   // OAuth sub or email for credentials
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id])
  
  @@unique([provider, providerId])
  @@index([userId])
}
```

### 4.4 User Flow — New User (OAuth)

```
1. User clicks "Sign in with Google" on /login or /signup
2. → GET /api/auth/signin/google (NextAuth initiates OAuth flow)
3. → Redirect to Google consent screen
4. → Google redirects back to /api/auth/callback/google
5. → NextAuth exchanges code for tokens, gets profile (email, name, picture)
6. → OAuthSignIn use case:
   a. Check if AccountLink exists for (google, googleUserId)
      → YES: Load user, issue session cookie, redirect to /dashboard
      → NO: Check if user exists with that email
         → YES: Prompt "Link accounts?" (if password user exists)
         → NO: Create new User + AccountLink, issue session, redirect to /onboarding
7. → Set amph_session cookie (same format as email/password login)
```

### 4.5 User Flow — Existing User (Link Account)

```
1. Logged-in user goes to /profile → "Connected Accounts"
2. Clicks "Connect Google"
3. → OAuth dance completes
4. → LinkOAuthAccount use case:
   a. Verify OAuth email matches logged-in user's email (or require explicit confirmation)
   b. Create AccountLink record
   c. Update User.oauthProvider/oauthId if this is their first OAuth link
5. → Show success toast
```

### 4.6 Security Requirements for OAuth Implementation

| Requirement | Implementation |
|---|---|
| PKCE | Auth.js enables PKCE by default for OAuth 2.0 |
| State parameter | Auth.js handles state + CSRF token automatically |
| Redirect URI validation | Auth.js validates against configured callback URLs |
| Token storage | Access tokens stored encrypted in DB, never in cookies |
| Account linking | Only link if OAuth email matches existing account email; prompt for confirmation otherwise |
| Account takeover prevention | Do NOT auto-link if email matches — require the user to be logged in first, or send a verification email |
| Provider token refresh | Auth.js handles refresh tokens transparently |
| Scopes | Request minimal scopes: `openid email profile` (Google), `email public_profile` (Facebook) |

### 4.7 New Environment Variables

```env
# OAuth — Google
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# OAuth — Facebook
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# NextAuth
NEXTAUTH_URL="${NEXT_PUBLIC_APP_URL}"
NEXTAUTH_SECRET="<generate-with-pnpm-gen-secret>"
```

### 4.8 New Dependencies

```json
{
  "next-auth": "^5.0.0-beta.x",
  "@auth/prisma-adapter": "^2.0.0"
}
```

### 4.9 UI Changes

**Login page (`/login`):** Add "Or continue with" divider + Google/Facebook buttons above or below the email/password form.

**Signup page (`/signup`):** Same social login buttons. When a user signs up via OAuth, skip email verification (OAuth providers already verify email ownership).

**Profile page (`/profile`):** Add "Connected Accounts" section showing linked providers with connect/disconnect actions.

**Admin login (`/admin-login`):** Keep email/password + TOTP only. Do NOT offer OAuth for admin accounts (security boundary).

---

## 5. Security Hardening Recommendations

### 5.1 Immediate (P0 — Do Before OAuth)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| H1 | Add CSP header with nonce | `src/proxy.ts`, `next.config.ts` | 2h |
| H2 | Add HSTS header | `src/proxy.ts` | 15min |
| H3 | Enforce account lockout in auth helpers | `src/lib/auth.ts` | 1h |
| H4 | Fix email enumeration in login/signup | Login/signup actions + route handlers | 1h |
| H5 | Add rate limiting to password reset | Password reset action | 30min |

### 5.2 Short-Term (P1 — Do With OAuth)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| H6 | Implement OAuth (Google + Facebook) | New files per §4.3 | 3-5 days |
| H7 | Add account linking UI + use case | `/profile`, `LinkOAuthAccount` | 1 day |
| H8 | Enforce admin 2FA policy | `requireAdmin()` enhancement | 2h |
| H9 | Add password strength requirements | `SignUp` use case + signup form | 2h |
| H10 | Wire `userId` to simulator actions | Simulator use cases | 1h |

### 5.3 Medium-Term (P2 — Post-OAuth Hardening)

| # | Action | Effort |
|---|--------|--------|
| H11 | Add Subresource Integrity (SRI) for CDN-loaded scripts | 1h |
| H12 | Implement request correlation IDs in structured logger | 2h |
| H13 | Add security.txt at `/.well-known/security.txt` | 15min |
| H14 | Review and tighten `Permissions-Policy` header | 30min |
| H15 | Implement webhook idempotency (PayMongo + Resend) | 2h |
| H16 | Add automated dependency audit in CI (`pnpm audit`) | 30min |
| H17 | Consider OWASP ZAP or similar DAST scan in CI | 1 day |

### 5.4 Long-Term (P3)

| # | Action | Effort |
|---|--------|--------|
| H18 | Implement progressive security: risk-based step-up auth for sensitive actions (refund, password change) | 2-3 days |
| H19 | Add login notification emails (new device/location) | 1 day |
| H20 | Implement session management dashboard (view active sessions, revoke individually) | 1 day |

---

## 6. CI/CD Security Audit

### 6.1 Workflow: `ci.yml`

**Pass 1 — Triggers:** ✅ Clean  
- `push: branches: [main]` and `pull_request: branches: [main]` — safe, no `pull_request_target`

**Pass 2 — Permissions:** ✅ Good  
- Top-level `permissions: contents: read` — least privilege

**Pass 3 — Action Pinning:** ⚠️ P1 — All actions pinned to tags, not SHA

```yaml
# Current (mutable):
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v4
- uses: gitleaks/gitleaks-action@v3.0.0

# Recommended (immutable):
- uses: actions/checkout@<full-sha>  # v4.x.x
- uses: pnpm/action-setup@<full-sha>  # v4.x.x
- uses: actions/setup-node@<full-sha>  # v4.x.x
- uses: actions/upload-artifact@<full-sha>  # v4.x.x
- uses: gitleaks/gitleaks-action@<full-sha>  # v3.0.0
```

**Pass 4 — Template Injection:** ✅ Clean  
- `${{ github.ref }}` in concurrency group is safe (not in `run:` block)  
- `${{ secrets.GITHUB_TOKEN }}` passed via `env:` to gitleaks — safe  

**Pass 5 — Untrusted Checkout:** ✅ Clean  
- No `pull_request_target`, no untrusted checkout

**Pass 6 — Caching:** ✅ Acceptable  
- `cache: pnpm` on setup-node — standard pattern, not in a release workflow

**Pass 7 — Artifact Injection:** ✅ Clean  
- Only uploads coverage/playwright reports, doesn't consume artifacts from other workflows

### 6.2 Workflow: `daily-triage.yml`

Not reviewed in this audit — recommend scanning separately.

### 6.3 Recommended CI Additions

```yaml
# Add to quality job:
- name: Dependency audit
  run: pnpm audit --audit-level=high
  continue-on-error: true  # Advisory initially, make blocking later

# Add as new job:
security-scan:
  name: Security scan
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@<sha>
    - name: Run npm audit
      run: pnpm audit --audit-level=critical
    - name: Check for known vulnerabilities
      run: npx --yes better-npm-audit audit
```

---

## 7. Prioritized Action Plan

### Phase 1: Pre-OAuth Hardening (1-2 days)

| Priority | Task | Story Points |
|----------|------|-------------|
| P0 | Add CSP + HSTS headers to `proxy.ts` | 2 |
| P0 | Enforce account lockout in `getSessionUserId()` | 1 |
| P0 | Fix email enumeration in login/signup/reset | 1 |
| P0 | Add rate limiting to password reset | 0.5 |
| P0 | Pin CI actions to SHA | 0.5 |

### Phase 2: OAuth Implementation (5-7 days)

| Priority | Task | Story Points |
|----------|------|-------------|
| P1 | Install `next-auth` + `@auth/prisma-adapter` | 0.5 |
| P1 | Add `AccountLink` model + User fields (Prisma migration) | 1 |
| P1 | Create `OAuthProvider` port + `AccountLinker` port | 1 |
| P1 | Implement `NextAuthProvider` (infra layer) | 2 |
| P1 | Create `OAuthSignIn` use case | 2 |
| P1 | Create `LinkOAuthAccount` use case | 1 |
| P1 | Wire OAuth routes (`/api/auth/[...nextauth]`) | 1 |
| P1 | Wire OAuth into composition container | 0.5 |
| P1 | Update login/signup UI with social buttons | 1.5 |
| P1 | Add "Connected Accounts" to profile page | 1 |
| P1 | Write unit tests for OAuth use cases | 2 |
| P1 | Write E2E tests for OAuth flow | 2 |
| P1 | Update `.env.example` with OAuth variables | 0.5 |

### Phase 3: Admin Security & Data Integrity (1-2 days)

| Priority | Task | Story Points |
|----------|------|-------------|
| P1 | Enforce admin 2FA requirement policy | 1 |
| P1 | Add password strength validation (min 8 chars, complexity) | 1 |
| P1 | Wire real `userId` into simulator actions | 1 |
| P2 | Add webhook idempotency checks | 1 |
| P2 | Add `pnpm audit` to CI | 0.5 |

### Phase 4: Post-Launch Hardening (ongoing)

| Priority | Task | Story Points |
|----------|------|-------------|
| P2 | SRI for external scripts | 1 |
| P2 | Security.txt | 0.25 |
| P2 | Correlation IDs in Pino logger | 1 |
| P3 | Risk-based step-up auth | 5 |
| P3 | Login notification emails | 2 |
| P3 | Session management dashboard | 3 |

---

## 8. Environment Variable Additions

```env
# ── OAuth (new) ─────────────────────────────────
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
NEXTAUTH_URL="${NEXT_PUBLIC_APP_URL}"
NEXTAUTH_SECRET=""  # Generate: openssl rand -base64 32

# ── Existing (no changes) ───────────────────────
DATABASE_URL=...
JWT_SECRET=...
PAYMONGO_SECRET=...
PAYMONGO_WEBHOOK_SECRET=...
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
EMAIL_VERIFICATION_SECRET=...
SENTRY_DSN=...
NEXT_PUBLIC_APP_URL=...
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (OAuth Use Cases)

```
src/usecases/__tests__/OAuthSignIn.test.ts
  ✓ creates new user from Google OAuth profile
  ✓ links OAuth to existing user by email match
  ✓ rejects OAuth with unverified email
  ✓ rejects OAuth when provider returns error
  ✓ sets session cookie after successful OAuth sign-in

src/usecases/__tests__/LinkOAuthAccount.test.ts
  ✓ links Google account to logged-in user
  ✓ prevents linking same provider twice
  ✓ prevents linking provider already used by another user
```

### 9.2 E2E Tests (Playwright)

```
e2e/oauth-flow.spec.ts
  ✓ new user can sign up with Google
  ✓ existing user can sign in with Google
  ✓ existing password user can link Google account
  ✓ OAuth user sees correct profile info
  ✓ admin login does NOT show OAuth options
  ✓ OAuth sign-in respects rate limiting
  ✓ OAuth callback handles invalid state parameter
```

### 9.3 Security-Specific Tests

```
src/lib/__tests__/auth.lockout.test.ts
  ✓ rejects JWT for locked user
  ✓ rejects JWT for disabled user

src/__tests__/proxy.headers.test.ts
  ✓ sets CSP header on all responses
  ✓ sets HSTS header on all responses
  ✓ CSP nonce is unique per request
```

---

## 10. References

| Reference | Source |
|-----------|--------|
| OWASP Top 10 (2025) | https://owasp.org/www-project-top-ten/ |
| NextAuth.js v5 Docs | https://authjs.dev/ |
| Next.js Security Headers | https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy |
| OAuth 2.0 Security Best Current Practice | https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics |
| Argon2 RFC 9106 | https://www.rfc-editor.org/rfc/rfc9106 |
| Jose (JWT) Best Practices | https://github.com/panva/jose |
| GitHub Actions Security | https://docs.github.com/en/actions/security-guides |
| OWASP Cheat Sheet Series | https://cheatsheetseries.owasp.org/ |

### Skills Loaded for This Audit

| Skill | Application |
|-------|------------|
| `nestjs-best-practices` | Security rules (rate limiting, input validation, guards, JWT auth) |
| `nestjs-patterns` | Auth guard patterns, exception filter shapes, DTO validation |
| `nestjs-expert` | JWT/Passport authentication reference, guard implementation |
| `nodejs-backend-patterns` | Middleware patterns, authentication, error handling |
| `nodejs-best-practices` | Security best practices, dependency management |
| `ci-cd-security` | GitHub Actions 9-pass audit methodology |

---

*This document should be committed to `docs/` and referenced in PR descriptions for the OAuth and security hardening work.*
