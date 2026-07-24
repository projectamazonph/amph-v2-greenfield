/**
 * LoginForm — pure HTML form that POSTs to /api/auth/login.
 *
 * STORY-066 refactor: the previous implementation used
 * `useActionState` + `useRouter` to invoke the loginAndRedirect
 * server action. That combination had a documented Next.js 16
 * pitfall where `redirect()` throws a NEXT_REDIRECT error that gets
 * swallowed under React 19 useActionState, producing a 500
 * "Server Components render" with a hashed digest in production.
 *
 * This form is now a plain HTML `<form method="POST">` pointing at
 * the /api/auth/login Route Handler. The browser handles the
 * 303 redirect natively; error states land back on
 * /login?error=<kind> where the page renders the alert. No client
 * state, no useEffect, no useRouter, no useActionState.
 *
 * Pure presentational. Renders the same fields as before. Receives
 * `redirectTo` (from the parent server component's searchParams)
 * and `errorKind` (also from searchParams) as props.
 */

import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./LoginForm.module.css";

const errorMessage: Record<string, string> = {
  wrong_password: "Incorrect email or password.",
  user_not_found: "No account with that email.",
  account_suspended: "This account has been suspended. Contact support.",
  account_locked: "This account is locked. Reset your password to unlock.",
  invalid_input: "Please enter your email and password.",
  rate_limited: "Too many login attempts. Please wait a few minutes and try again.",
};

export function LoginForm({
  redirectTo,
  errorKind,
}: {
  redirectTo: string;
  errorKind: string | null;
}) {
  const errorText = errorKind ? errorMessage[errorKind] ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Project Amazon PH Academy</div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your training.</p>
        </div>

        {errorText && (
          <div className="alert alert-error">{errorText}</div>
        )}

        <form method="POST" action="/api/auth/login" className={styles.form}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <Input
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            size="md"
          />

          <Input
            name="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            size="md"
          />

          <Button type="submit" variant="primary" size="lg" className={styles.submit}>
            Sign in
          </Button>
        </form>

        <p className={styles.altPrompt}>
          New to Project Amazon PH Academy?{" "}
          <Link href="/signup" className={styles.altLink}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
