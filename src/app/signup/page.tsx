/**
 * /signup — STORY-004.
 *
 * Server component shell. The actual form lives in <SignupForm> (a
 * client component) because it consumes `useSearchParams` to display
 * any `?error=...` query param that the signUpAndRedirect server
 * action appends on failure. Next.js requires a <Suspense> boundary
 * around any client component that calls useSearchParams during
 * static prerender.
 *
 * STORY-046 follow-up: this page no longer needs `useActionState`,
 * `useEffect`, or `useRouter`. The form posts to `signUpAndRedirect`,
 * which calls Next's `redirect()` directly — matching the
 * `loginAndRedirect` pattern in src/app/actions/login.action.ts.
 * This is the only known-working pattern for combining server-action
 * redirects with React 19 in Next.js 16.
 */

import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
