/**
 * Sign up page - Story 004.
 *
 * STORY-046 fix: the server action returns { kind: "success", redirectTo }
 * instead of calling redirect(). This page handles navigation client-side
 * via useEffect + router.push() to avoid the NEXT_REDIRECT / React 19
 * useActionState conflict that caused a client-side crash.
 */

"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUpAction, type SignUpState } from "../actions/signup.action";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./signup.module.css";

const INITIAL_STATE: SignUpState = { kind: "idle" };

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, INITIAL_STATE);
  const router = useRouter();

  // Navigate client-side when the action returns a redirect URL.
  // We avoid Next redirect() in server actions because React 19
  // useActionState does not catch thrown NEXT_REDIRECT - it
  // propagates as an unhandled exception and crashes the client.
  useEffect(() => {
    if (state.kind === "success" && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

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

        {/* Only show check your email when auto-login did not succeed */}
        {state.kind === "success" && !state.redirectTo && (
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
            {isPending ? "Creating account..." : "Create account"}
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
