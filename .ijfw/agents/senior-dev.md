---
name: senior-dev
model: sonnet
effort: medium
description: Implement the signup redirect fix (action wrapper + page refactor + tests)
---

# senior-dev

Implements the fix decided by the architect.

Files in scope:

- src/app/actions/signup.action.ts — add signUpAndRedirect(formData) wrapper
  that calls performSignUp, then calls redirect() on success or
  redirect("/signup?error=<kind>") on error.
- src/app/signup/page.tsx — convert to a server component, wrap form in
  <Suspense> (per Next 16 useSearchParams pattern), delegate the form
  rendering to a new client component.
- src/app/signup/SignupForm.tsx — new client component; uses useSearchParams
  to read ?error=... and render an error alert. form action={signUpAndRedirect}.
  No useActionState, no useEffect, no useRouter.
- src/app/actions/**tests**/signup.action.test.ts — drop the redirectTo
  assertion on performSignUp; add a test for the signUpAndRedirect wrapper
  that mocks next/navigation redirect.
- src/app/signup/**tests**/page.test.tsx — confirm it still passes with the
  new server-component shape (no useRouter).

Rules:

- Don't import from next/* inside src/domain/ or src/usecases/.
- Don't throw exceptions across layer boundaries; return Result.
- Don't use `number` for money.
- Match the loginAndRedirect pattern exactly — it works, E2E passes, CI green.
