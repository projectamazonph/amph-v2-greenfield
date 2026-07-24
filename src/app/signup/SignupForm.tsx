/**
 * SignupForm — pure HTML form that POSTs to /api/auth/signup.
 *
 * STORY-066 refactor: see LoginForm for the rationale. The previous
 * implementation used useActionState + useRouter + useEffect, which
 * had a Next.js 16 / React 19 NEXT_REDIRECT pitfall. Now it's a plain
 * HTML form pointing at a Route Handler — the browser handles the
 * 303 redirect, no client state machine required.
 *
 * Pure presentational. Receives `errorKind` (from the parent server
 * component's searchParams) as a prop.
 */

import Link from "next/link";
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

export function SignupForm({ errorKind }: { errorKind: string | null }) {
  const errorText = errorKind ? errorMessage[errorKind] ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Project Amazon PH Academy</div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Master Amazon PPC and Seller Central - built for Filipino VAs.
          </p>
        </div>

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

        <form method="POST" action="/api/auth/signup" className={styles.form}>
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
