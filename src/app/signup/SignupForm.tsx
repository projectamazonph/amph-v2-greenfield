/**
 * SignupForm — the client component for the /signup page.
 *
 * Lives in its own file so the parent page (a server component) can
 * wrap it in <Suspense> (required for any client component that
 * consumes useSearchParams during static prerender).
 *
 * Mirrors src/app/login/LoginForm.tsx in shape.
 *
 * STORY-046 follow-up: the form posts to `signUpAndRedirect`, a
 * server action that calls Next's `redirect()` directly on both
 * success (to /dashboard) and failure (back to /signup?error=...).
 * This client component does NOT use useActionState, useEffect, or
 * useRouter. Those broke the SSR unit test (useRouter isn't mounted
 * under renderToString) and the E2E test (client-side router.push
 * didn't carry the auth cookie to /dashboard).
 */

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpAndRedirect } from "../actions/signup.action";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./signup.module.css";

const errorMessage: Record<string, string> = {
  invalid_input: "Please fill in all fields.",
  email_taken: "That email is already registered. Try signing in instead.",
  weak_password: "Password is too weak. Use 8+ characters with uppercase, numbers, and symbols.",
  invalid_name: "Please enter your first and last name.",
  invalid_email: "Please enter a valid email address.",
  db_error: "Could not create your account right now. Please try again.",
  unexpected: "Something went wrong. Please try again.",
  rate_limited: "Too many attempts. Please wait a few minutes before trying again.",
};

export function SignupForm() {
  const params = useSearchParams();
  const errorKind = params.get("error");
  const errorText = errorKind ? (errorMessage[errorKind] ?? null) : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>Project Amazon PH Academy</div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Master Amazon PPC and Seller Central - built for Filipino VAs.
          </p>
        </div>

        {/* Error alert — only when the server action redirected back with ?error=... */}
        {errorText && (
          <div className="alert alert-error">
            {errorKind === "email_taken" ? (
              <>
                That email is already registered. Try{" "}
                <Link href="/login" className={styles.link}>
                  signing in
                </Link>{" "}
                instead.
              </>
            ) : (
              errorText
            )}
          </div>
        )}

        {/* Form */}
        <form action={signUpAndRedirect} className={styles.form}>
          <div className={styles.row}>
            <Input
              name="firstName"
              label="First name"
              placeholder="Juan"
              autoComplete="given-name"
              required
              size="md"
            />
            <Input
              name="lastName"
              label="Last name"
              placeholder="Dela Cruz"
              autoComplete="family-name"
              required
              size="md"
            />
          </div>

          <Input
            name="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            size="md"
          />

          <div>
            <Input
              name="password"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              size="md"
            />
            <p className={styles.hint}>8+ chars, uppercase, number, and symbol recommended.</p>
          </div>

          <Button type="submit" variant="primary" size="lg" style={{ width: "100%" }}>
            Create account
          </Button>
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
