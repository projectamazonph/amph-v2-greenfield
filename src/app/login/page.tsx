/**
 * /login — STORY-006.
 *
 * Renders the login form. On success, the server action sets the
 * auth cookie and the page navigates to the redirectTo (default
 * /courses).
 *
 * The page is a client component because the form posts via a server
 * action AND we need useSearchParams to read the optional `?redirect=...`
 * query param. The actual page wrapper is a server component that
 * defers to a <Suspense> for the client-side inner part (Next.js
 * requires this for any client component that uses useSearchParams).
 *
 * Mirrors src/app/signup/page.tsx in shape. Uses the same legacy
 * utility CSS classes (.btn-primary, .form-input, .alert) that the
 * signup page uses; a future migration story will swap them for the
 * new @/components/ui/ primitives.
 */

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
