/**
 * Sign up page — Story 004.
 *
 * Uses React's `useFormState` (now `useActionState` in React 19)
 * with a server action for progressive enhancement.
 * Works without JavaScript — form submits normally, page reloads with result.
 */

"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUpAction, type SignUpState } from "../actions/signup.action";
import Link from "next/link";

const INITIAL_STATE: SignUpState = { kind: "invalid_input" };

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, INITIAL_STATE);
  const router = useRouter();

  // On success, the cookie is set by the action and we navigate
  // to the dashboard. A hard navigation (router.push) ensures the
  // server components on /dashboard re-render with the new session.
  useEffect(() => {
    if (state.kind === "success") {
      router.push("/dashboard");
    }
  }, [state.kind, state.kind === "success" ? state.email : null]);

  void router;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>AMPH</div>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>
            Master Amazon PPC and Seller Central — built for Filipino VAs.
          </p>
        </div>

        {/* Error alert */}
        {state.kind !== "success" && (
          <div style={styles.alert}>
            {state.kind === "invalid_input" && <>Please fill in all fields.</>}
            {state.kind === "email_taken" && (
              <>
                That email is already registered. Try{" "}
                <Link href="/login" style={styles.link}>
                  signing in
                </Link>{" "}
                instead.
              </>
            )}
            {state.kind === "weak_password" && (
              <>Password is too weak. Use 8+ characters with uppercase, numbers, and symbols.</>
            )}
            {state.kind === "invalid_name" && (
              <>{state.field === "firstName" ? "First" : "Last"} name is required.</>
            )}
            {state.kind === "invalid_email" && <>Please enter a valid email address.</>}
            {state.kind === "db_error" && (
              <>Could not create your account right now. Please try again.</>
            )}
            {state.kind === "unexpected" && <>Something went wrong. Please try again.</>}
          </div>
        )}

        {/* Success */}
        {state.kind === "success" && (
          <div
            style={{
              ...styles.alert,
              background: "#ECFDF5",
              color: "#0E7C3A",
              borderColor: "#A7F3D0",
            }}
          >
            Account created for <strong>{state.email}</strong>! Check your email to verify your
            account.
          </div>
        )}

        {/* Form */}
        <form action={formAction} style={styles.form}>
          <div style={styles.row}>
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className="form-input"
                placeholder="Juan"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Last name
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                className="form-input form-input-grow"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span style={styles.hint}>8+ chars, uppercase, number, and symbol recommended.</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Inline styles (no Tailwind — Field Manual design system) ─

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    background: "var(--surface-0)",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "40px 40px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  logo: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--accent)",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--ink-900)",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 15,
    color: "var(--ink-500)",
    lineHeight: 1.5,
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "var(--radius)",
    fontSize: 14,
    background: "var(--danger-soft)",
    color: "var(--danger)",
    border: "1px solid #FECACA",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  hint: {
    fontSize: 12,
    color: "var(--ink-500)",
  },
  footer: {
    textAlign: "center",
    fontSize: 14,
    color: "var(--ink-500)",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 600,
  },
};
