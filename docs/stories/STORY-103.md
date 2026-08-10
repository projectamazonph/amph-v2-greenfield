# STORY-103: Admin access management and responsive recovery

**Sprint:** 16 follow-up

**Points:** 5

**Epic:** Admin operations

**Owner:** Ryan
**Status:** Done

## Goal

Make the admin console usable on phones and complete the missing student
access workflow. An admin must be able to change a subscription tier, grant
course access, revoke it without losing progress, and restore it later.

## Scope

- Pin the Astryx theme to light mode so its cards and table text use the same
  color mode as the AMPH shell.
- Make the admin shell, headers, cards, filters, tables, navigation drawer, and
  content grids responsive.
- Add audited course enrollment grant, revoke, and restore operations.
- Block restoration of refunded enrollments.
- Add tier and course-access controls to `/admin/users/[id]`.
- Replace fake dashboard trends and dead controls with real audit activity,
  pending refund counts, and working links.
- Replace the content placeholder with real course, module, and lesson counts.
- Run `prisma migrate deploy` in the Vercel build so additive migrations such
  as the download-center `resources` table reach the deployed database.

## Acceptance checks

- Admin tier changes persist and record the previous and new tier.
- Enrollment changes preserve progress and create an audit entry.
- Refunded enrollment restoration fails closed.
- The user detail page works at desktop, tablet, and mobile widths without
  horizontal page overflow.
- Simulator, quiz, resource, and content load failures show readable states.
- Typecheck, lint, architecture tests, full unit/integration suite, coverage,
  production build, and the authenticated Playwright journey pass.
