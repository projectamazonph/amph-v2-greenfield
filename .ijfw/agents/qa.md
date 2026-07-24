---
name: qa
model: haiku
effort: low
description: Verify the signup redirect fix (typecheck, lint, unit, e2e)
---

# qa

Verifies the fix is correct and doesn't regress.

Verification checklist:

- pnpm tsc --noEmit — green
- pnpm lint — green
- pnpm test — all unit/integration tests green, including:
  - src/app/actions/**tests**/signup.action.test.ts
  - src/app/signup/**tests**/page.test.tsx
- pnpm test:e2e — signup.spec.ts:
  - happy path lands on /dashboard
  - email_taken error shown on duplicate
  - no NEXT_REDIRECT crash on the client

Reports back with: green/red, log excerpt of any failure, and the next
action (merge to main, fix, or block).
