/**
 * LoginForm — the client component for the /login page.
 *
 * Lives in its own file so the parent page (a server component) can
 * wrap it in <Suspense> (required for any client component that
 * consumes useSearchParams during static prerender).
 *
 * STORY-006. Migrated from inline React.CSSProperties to AMPH components.
 * User-facing brand name: Project Amazon PH Academy.
 */

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAndRedirect } from "../actions/login.action";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/courses";
  const errorFromQuery = params.get("error");

  const knownErrors = [
    "wrong_password",
    "user_not_found",
    "account_suspended",
    "account_locked",
    "invalid_input",
    "rate_limited",
  ];

  const errorMessage: Record<string, string> = {
    wrong_password: "Incorrect email or password.",
    user_not_found: "No account with that email.",
    account_suspended: "This account has been suspended. Contact support.",
    account_locked: "This account is locked. Reset your password to unlock.",
    invalid_input: "Please enter your email and password.",
    rate_limited: "Too many login attempts. Please wait a few minutes and try again.",
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Project Amazon PH Academy</div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your training.</p>
        </div>

        {errorFromQuery && (
          <div className="alert alert-error">
            {errorMessage[errorFromQuery] ?? "Sign-in failed. Please try again."}
          </div>
        )}

        <form action={loginAndRedirect} className={styles.form}>
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
