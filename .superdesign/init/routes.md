# Routes — Project Amazon PH Academy v2

Next.js 16 App Router. Path layout under `src/app/`. Server components by default; client components
opt-in via `"use client"`.

## Public / marketing

| URL                      | Entry file                          | Layout         | Notes                              |
| ------------------------ | ----------------------------------- | -------------- | ---------------------------------- |
| `/`                      | `src/app/page.tsx`                  | none (root)    | Landing — full-bleed, server-only  |
| `/pricing`               | `src/app/pricing/page.tsx`          | root           | Standalone pricing detail          |
| `/faq`                   | `src/app/faq/page.tsx`              | root           | FAQ detail                          |
| `/courses`               | `src/app/courses/page.tsx`          | root           | Course catalog                      |
| `/resources`             | `src/app/resources/page.tsx`        | root           | Free resources                      |
| `/login`                 | `src/app/login/page.tsx`            | auth layout    | Student / general login            |
| `/signup`                | `src/app/signup/page.tsx`           | auth layout    | Account creation                    |
| `/admin-login`           | `src/app/admin-login/page.tsx`      | auth layout    | Admin-only login                    |
| `/reset-password`        | `src/app/reset-password/page.tsx`   | auth layout    | Request password reset              |
| `/verify-email`          | `src/app/verify-email/page.tsx`     | auth layout    | Email verification                  |
| `/maintenance`           | `src/app/maintenance/page.tsx`      | root           | Maintenance splash                  |

## Student (logged-in, behind `/proxy.ts` auth check)

| URL                                       | Entry                                        | Notes                          |
| ----------------------------------------- | -------------------------------------------- | ------------------------------ |
| `/dashboard`                              | `src/app/dashboard/page.tsx`                 | Main hub — sidebar + widgets   |
| `/dashboard/first-decision`               | `…/first-decision/page.tsx`                  | Onboarding step                |
| `/dashboard/onboarding-complete`          | `…/onboarding-complete/page.tsx`             | Onboarding completion screen   |
| `/dashboard/diagnostic`           | `…/diagnostic/page.tsx`                      | Diagnostic result view         |
| `/welcome`                                | `src/app/welcome/page.tsx`                   | First-run walkthrough (5 steps) |
| `/assignments`                            | `src/app/assignments/page.tsx`               | Assignment hub                 |
| `/capstone`                               | `src/app/capstone/page.tsx`                  | Capstone brief                 |
| `/certificates`                           | `src/app/certificates/page.tsx`              | Earned certificates list       |
| `/live-classes`                           | `src/app/live-classes/page.tsx`              | Schedule + recordings          |
| `/portfolio`                              | `src/app/portfolio/page.tsx`                 | Student portfolio (LEARN-035)   |
| `/checkout`                               | `src/app/checkout/page.tsx`                  | PayMongo checkout flow         |
| `/profile`                                | `src/app/profile/page.tsx`                   | Account settings root          |
| `/profile/security`                       | `…/profile/security/page.tsx`                | 2FA, sessions                  |
| `/profile/security/2fa-setup`             | `…/profile/security/2fa-setup/page.tsx`      | 2FA enrolment wizard           |
| `/profile/data`                           | `…/profile/data/page.tsx`                    | Export + delete account         |
| `/tools/bid-elevator`                     | `src/app/tools/bid-elevator/page.tsx`        | Simulator                      |
| `/tools/campaign-builder`                 | `src/app/tools/campaign-builder/page.tsx`    | Simulator                      |
| `/tools/listing-audit`                    | `src/app/tools/listing-audit/page.tsx`       | Simulator                      |
| `/tools/str-triage`                       | `src/app/tools/str-triage/page.tsx`          | Simulator                      |
| `/tools/keyword-research`                 | `src/app/tools/keyword-research/page.tsx`    | Simulator                      |
| `/courses/[slug]`                         | `src/app/courses/[slug]/page.tsx`            | Course module list             |
| `/courses/[slug]/[lesson]`                | `…/[slug]/[lesson]/page.tsx`                 | Lesson reader (MDX)            |

## Admin (logged-in, ADMIN role, behind `/proxy.ts` admin route)

| URL                                       | Entry                                        | Notes                          |
| ----------------------------------------- | -------------------------------------------- | ------------------------------ |
| `/admin`                                  | `src/app/admin/page.tsx`                     | Admin dashboard                |
| `/admin/users`                            | `src/app/admin/users/page.tsx`               | User roster                    |
| `/admin/courses`                          | `src/app/admin/courses/page.tsx`             | Course CRUD                    |
| `/admin/simulators`                       | `src/app/admin/simulators/page.tsx`          | Scenario publishing            |
| `/admin/simulators/[id]/versions`         | `…/simulators/[id]/versions/page.tsx`        | Scenario versioning            |
| `/admin/email-templates`                  | `src/app/admin/email-templates/page.tsx`     | List editable email templates  |
| `/admin/email-templates/[type]/edit`      | `…/[type]/edit/page.tsx`                     | Edit one template              |
| `/admin/refunds`                          | `src/app/admin/refunds/page.tsx`             | Refund queue                   |
| `/admin/orders`                           | `src/app/admin/orders/page.tsx`              | Order ledger                   |
| `/admin/settings`                         | `src/app/admin/settings/page.tsx`            | Admin 2FA opt-in               |
| `/admin/settings/2fa-setup`               | `…/settings/2fa-setup/page.tsx`              | 2FA enrolment                  |
| `/admin/certificates`                     | `src/app/admin/certificates/page.tsx`        | Issue/revoke certificates      |

## API routes (no UI)

| URL                                | Entry                                          | Notes                       |
| ---------------------------------- | ---------------------------------------------- | --------------------------- |
| `/api/webhooks/paymongo`           | `src/app/api/webhooks/paymongo/route.ts`       | PayMongo webhook receiver   |
| `/api/auth/admin-login`            | `src/app/api/auth/admin-login/route.ts`        | Admin session route         |
| `/api/health`                      | `src/app/api/health/route.ts`                  | Liveness                    |
| `/api/quizzes/[quizId]/attempt`    | `src/app/api/quizzes/[quizId]/attempt/route.ts`| Quiz submit endpoint        |

## Layout / shell

- **Root layout:** `src/app/layout.tsx` — global font load, html shell, body wrapper, global-error
  handler, providers, `src/proxy.ts` route-protection.
- **No nested marketing layout** — landing/pricing/faq render the root layout directly so the
  marketing surfaces stay server-only.
- **Student dashboard layout:** implied through the page composition (`StudentSidebar` rendered in
  `page.tsx` directly, not a separate `layout.tsx`).
- **Admin layout:** `src/app/admin/layout.tsx` — wraps the navy admin sidebar (240px sticky).
- **Auth layout:** `src/app/(auth)/layout.tsx` — wraps login/signup/reset/verify/admin-login with
  centered card shell.