/**
 * Sign up page — Story 004.
 *
 * Migrated from inline React.CSSProperties styles to AMPH components.
 * Uses React's `useActionState` (formerly useFormState) with a server action
 * for progressive enhancement — works without JavaScript.
 */

"use client";

import { useActionState } from "react";
import { signUpAction, type SignUpState } from "../actions/signup.action";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./signup.module.css";

const INITIAL_STATE: SignUpState = { kind: "idle" };

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, INITIAL_STATE);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>AMPH</div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Master Amazon PPC and Seller Central — built for Filipino VAs.
          </p>
        </div>

        {/* Error / success alerts */}
        {state.kind !== "idle" && state.kind !== "success" && (
          <div className="alert alert-error">
            {state.kind === "invalid_input" && <>Please fill in all fields.</>}
            {state.kind === "email_taken" && (
              <>
                That email is already registered. Try{" "}
                <Link href="/login" className={styles.link}>
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
            {state.kind === "rate_limited" && (
              <>Too many attempts. Please wait a few minutes before trying again.</>
            )}
          </div>
        )}

        {state.kind === "success" && (
          <div className="alert alert-success">
            Account created for <strong>{state.email}</strong>! Check your email to verify your
            account.
          </div>
        )}

        {/* Form */}
        <form action={formAction} className={styles.form}>
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isPending}
            style={{ width: "100%" }}
          >
            {isPending ? "Creating account…" : "Create account"}
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
