/**
 * ResetRequestForm — client component.
 *
 * Submits to requestPasswordResetAction. On success, shows
 * "check your email" copy (regardless of whether the email
 * exists, to prevent enumeration).
 *
 * M-16 fix: the email field now uses the shared `Input` primitive so
 * the visual treatment (label / focus ring / height / error styling)
 * matches the rest of the auth surface (LoginForm, SignupForm,
 * AdminLoginForm). The form-level error message still renders as its
 * own alert paragraph because the server action returns a kind
 * ("rate_limited", "validation_failed") that is independent of the
 * field state.
 */

"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  initialRequestResetState,
} from "@/app/actions/authPasswordReset.action";
import { Input } from "@/components/ui";
import styles from "./ResetRequestForm.module.css";

export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialRequestResetState,
  );

  if (state.kind === "sent") {
    return (
      <p className={styles.sent}>
        If that email is on file, we sent a reset link. Check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <Input name="email" label="Email" type="email" required autoComplete="email" size="md" />
      {state.message ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
