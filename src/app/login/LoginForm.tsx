/**
 * LoginForm — the client component for the /login page.
 *
 * Lives in its own file so the parent page (a server component) can
 * wrap it in <Suspense> (required for any client component that
 * consumes useSearchParams during static prerender).
 *
 * STORY-006.
 */

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAndRedirect } from "../actions/login.action";

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/courses";
  const errorFromQuery = params.get("error");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>AMPH</div>
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to continue your training.</p>
        </div>

        {errorFromQuery && (
          <div style={styles.alert}>
            {errorFromQuery === "wrong_password" && "Incorrect email or password."}
            {errorFromQuery === "user_not_found" && "No account with that email."}
            {errorFromQuery === "account_suspended" && "This account has been suspended. Contact support."}
            {errorFromQuery === "account_locked" && "This account is locked. Reset your password to unlock."}
            {errorFromQuery === "invalid_input" && "Please enter your email and password."}
            {!["wrong_password", "user_not_found", "account_suspended", "account_locked", "invalid_input"].includes(
              errorFromQuery,
            ) && "Sign-in failed. Please try again."}
          </div>
        )}

        <form action={loginAndRedirect} style={styles.form}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submit}>
            Sign in
          </button>
        </form>

        <p style={styles.altPrompt}>
          New to AMPH Academy?{" "}
          <Link href="/signup" style={styles.altLink}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Inline styles (matches the signup page's pattern) ─────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-6)",
    fontFamily: "var(--font-body)",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-8)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "var(--text-xl)",
    letterSpacing: "0.04em",
    color: "var(--accent)",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    color: "var(--ink-900)",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--ink-700)",
    lineHeight: "var(--leading-normal)",
  },
  alert: {
    padding: "var(--space-3) var(--space-4)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    background: "var(--danger-soft)",
    color: "var(--danger)",
    border: "1px solid #FECACA",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  submit: {
    width: "100%",
    marginTop: "var(--space-2)",
  },
  altPrompt: {
    textAlign: "center",
    fontSize: "var(--text-sm)",
    color: "var(--ink-500)",
    margin: 0,
  },
  altLink: {
    color: "var(--accent)",
    fontWeight: 500,
  },
};
