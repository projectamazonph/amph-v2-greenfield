# Wireframes

Low-fidelity layout sketches for every planned Project Amazon PH Academy screen, one file per screen, styled with the Field Manual tokens in [`assets/tokens.css`](./assets/tokens.css) (same palette as `docs/ui-specs/DESIGN-SPEC.md` §1-2). Open any `.html` file directly in a browser — no build step.

Each page carries a status chip reflecting the **actual** repo state, not the target design:

- 🟠 **Built** — the page/route already exists in `src/app`.
- ⬜ **Ready** — the domain/use case/port is implemented, but no page has been written yet.
- ▫️ **Planned** — nothing built (mostly Sprint 10 admin work).

For the corresponding system-wiring diagrams (not UI), see [`docs/architecture/`](../../architecture/README.md).

## Public

| Screen                                         | Route                | Status                    |
| ---------------------------------------------- | -------------------- | ------------------------- |
| [Landing](./public/landing.html)               | `/`                  | Built                     |
| [Pricing](./public/pricing.html)               | `/pricing`           | Ready                     |
| [Course catalog](./public/course-catalog.html) | `/courses`           | Built                     |
| [Course detail](./public/course-detail.html)   | `/courses/[slug]`    | Built                     |
| [Sign up / Log in](./public/auth.html)         | `/signup` · `/login` | Signup built, login ready |

## Student

| Screen                                              | Route                          | Status          |
| --------------------------------------------------- | ------------------------------ | --------------- |
| [Dashboard](./student/dashboard.html)               | `/dashboard`                   | Ready           |
| [Lesson](./student/lesson.html)                     | `/courses/[slug]/lessons/[id]` | Built           |
| [Quiz](./student/quiz.html)                         | `.../lessons/[id]/quiz`        | API only, no UI |
| [Profile & badges](./student/profile-badges.html)   | `/profile`                     | Ready           |
| [Certificate view](./student/certificate-view.html) | `/certificates/[hash]`         | Built           |

## Tools (simulators)

| Screen                                                                          | Route                     | Status         |
| ------------------------------------------------------------------------------- | ------------------------- | -------------- |
| [Tools index](./tools/tools-index.html)                                         | `/tools`                  | Registry ready |
| [Bid Elevator](./tools/bid-elevator.html)                                       | `/tools/bid-elevator`     | Ready          |
| [STR Triage](./tools/str-triage.html)                                           | `/tools/str-triage`       | Ready          |
| [Campaign Builder](./tools/campaign-builder.html)                               | `/tools/campaign-builder` | Ready          |
| [Listing Audit + Keyword Research](./tools/listing-audit-keyword-research.html) | `/tools/listing-audit`    | Ready          |

## Admin (Sprint 10 — entirely planned)

| Screen                                                              | Route                                                    | Status                           |
| ------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------- |
| [Admin dashboard](./admin/dashboard.html)                           | `/admin`                                                 | Planned                          |
| [Users — list + detail](./admin/users.html)                         | `/admin/users` · `/admin/users/[id]`                     | Planned                          |
| [Courses — list + module editor](./admin/courses.html)              | `/admin/courses` · `/admin/courses/[id]/modules/[id]`    | Planned                          |
| [Payments — list + detail](./admin/payments.html)                   | `/admin/payments` · `/admin/payments/[id]`               | Planned                          |
| [Refunds — list + override](./admin/refunds.html)                   | `/admin/refunds` · `override-refund`                     | Planned                          |
| [Simulators — index + scenario editor](./admin/simulators.html)     | `/admin/simulators/[sim]/scenarios/[id]/edit`            | Planned                          |
| [Live classes](./admin/live-classes.html)                           | `/admin/live-classes`                                    | Planned — no Prisma model either |
| [Discount codes](./admin/discount-codes.html)                       | `/admin/discount-codes`                                  | Planned — model exists, no UI    |
| [Badges + Audit log + Settings](./admin/badges-audit-settings.html) | `/admin/badges` · `/admin/audit-log` · `/admin/settings` | Planned                          |
