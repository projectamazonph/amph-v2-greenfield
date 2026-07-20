/**
 * ResetRequestForm — client component.
 *
 * Submits to requestPasswordResetAction. On success, shows
 * "check your email" copy (regardless of whether the email
 * exists, to prevent enumeration).
 */

"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  initialRequestResetState,
} from "@/app/actions/authPasswordReset.action";
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
      <label className={styles.label} htmlFor="rp-email">
        Email
      </label>
      <input
        id="rp-email"
        name="email"
        type="email"
        required
        className={styles.input}
        autoComplete="email"
      />
      {state.message ? <p className={styles.error}>{state.message}</p> : null}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
