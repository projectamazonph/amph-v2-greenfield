# STORY-004 · First server action + first page: signup form

**Sprint:** 1
**Points:** 1
**Epic:** Auth
**Owner:** Ryan
**Dependencies:** STORY-003
**Status:** ✅ Done (shipped in initial greenfield bootstrap; `src/app/actions/signup.action.ts` + `src/app/signup/page.tsx`)

## Goal

Expose the `SignUp` use case as a server action, and build the signup form page. After this story, a user can sign up from a real form, the action calls the use case, and the user is redirected to a "check your email" page. The form is mobile-first responsive per the Field Manual design system.

## Acceptance criteria

- [ ] `src/app/layout.tsx` — root layout, loads Space Grotesk + JetBrains Mono fonts, imports `src/styles/tokens.css` and `src/styles/globals.css`.
- [ ] `src/app/page.tsx` — landing page with a placeholder hero and a "Sign up" CTA.
- [ ] `src/app/(auth)/layout.tsx` — auth-section layout, no sidebar, centered form.
- [ ] `src/app/(auth)/signup/page.tsx` — RSC shell that renders `<SignupForm />`.
- [ ] `src/app/(auth)/signup/SignupForm.tsx` — `'use client'` form with email, password, displayName inputs and a submit button. Mobile-first responsive. Field Manual styling.
- [ ] `src/app/(auth)/signup/sent/page.tsx` — "Check your email" page with a clear instruction.
- [ ] `src/app/actions/auth.ts` — `signUpAction(formData)` server action. Returns the documented `SignUpActionResult` discriminated union. Redirects on success.
- [ ] `src/composition/container.ts` — `buildContainer()` with real adapters (Pino, Prisma, etc.).
- [ ] `src/composition/requestContainer.ts` — `AsyncLocalStorage` wrapper.
- [ ] `src/middleware.ts` — minimal middleware, sets up the request container.
- [ ] Manual smoke test: signup flow works end-to-end at 390px and 1280px.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `src/styles/tokens.css` | Create — design tokens (color, type, spacing) |
| `src/styles/globals.css` | Create — base styles |
| `src/app/layout.tsx` | Create |
| `src/app/page.tsx` | Create |
| `src/app/(auth)/layout.tsx` | Create |
| `src/app/(auth)/signup/page.tsx` | Create |
| `src/app/(auth)/signup/SignupForm.tsx` | Create |
| `src/app/(auth)/signup/SignupForm.module.css` | Create |
| `src/app/(auth)/signup/sent/page.tsx` | Create |
| `src/app/actions/auth.ts` | Create |
| `src/composition/container.ts` | Create |
| `src/composition/requestContainer.ts` | Create |
| `src/middleware.ts` | Create |

## Code shape

See `docs/sprint-1/PLAN.md` §"STORY-004" for the full code shape. Key files:

```ts
// src/app/actions/auth.ts
"use server";

export type SignUpActionResult =
  | { ok: true; userId: string }
  | { ok: false; error: SignUpError | { kind: "internal" } };

export async function signUpAction(formData: FormData): Promise<SignUpActionResult> {
  const ip = (formData.get("ip") as string | null) ?? "0.0.0.0";
  const c = container.get();
  const parsed = SignUpInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    ip,
  });
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation_failed", issues: parsed.error.issues } };
  }
  const result = await new SignUp({ ...c, emailVerificationSecret: process.env.EMAIL_VERIFICATION_SECRET! }).exec(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  redirect("/signup/sent");
}
```

```tsx
// src/app/(auth)/signup/SignupForm.tsx
"use client";

import { useState, useTransition } from "react";
import { signUpAction } from "@/app/actions/auth";

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form action={(formData) => {
      startTransition(async () => {
        const result = await signUpAction(formData);
        if (result && !result.ok) setError(renderError(result.error));
      });
    }} className={styles.form}>
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field name="password" label="Password" type="password" required autoComplete="new-password" />
      <Field name="displayName" label="Display name" type="text" required minLength={2} maxLength={50} />
      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? "Creating account..." : "Create account"}
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
```

## Pitfalls

- **`redirect()` throws.** It must be called as the last line of the action, outside any `try/catch` that swallows errors. The `useTransition` in the client component handles the navigation.
- **`container.get()` throws if not in a request scope.** The middleware sets up the request container. If you call `container.get()` outside a request (e.g. in a build-time script), it throws. That's intentional.
- **The form is `'use client'`.** The page is RSC. The `'use client'` boundary is at the form, not the page.
- **The form action returns `Promise<SignUpActionResult>`.** Use the React 19 form action syntax: `<form action={async (formData) => { ... }}>`. This handles the transition for you; the `useTransition` is for the in-flight state.
- **Mobile-first responsive.** Test at 390px. The form is one column. Labels above inputs. Tap targets are at least 44px.
- **The Field Manual aesthetic.** Off-white background, orange accent on the submit button, JetBrains Mono for the email input (monospace tabular look), Space Grotesk for everything else. No glassmorphism, no gradient orbs.
- **The `ip` field is a stub.** Real IP comes from middleware in STORY-009. For STORY-004, the form sends a hardcoded IP or reads from a hidden input.

## Verification

```bash
pnpm dev
# Open http://localhost:3000/signup
# Fill in the form, submit
# Should redirect to /signup/sent
# Check the database: User row exists
# Check the email queue (or console, in dev): verification email is logged
```

Smoke test at 390px and 1280px. The form should be usable at both.

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `signUpAction` returns the documented discriminated union.
- [ ] `redirect()` is the last line of the action on success.
- [ ] The form is mobile-first responsive (test at 390px).
- [ ] Manual smoke: signup flow works end-to-end.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-004.md` exists (this file).
- [ ] Conventional commit: `feat(auth): signup server action + signup page (STORY-004)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
