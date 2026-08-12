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
  type RequestResetState,
} from "@/app/actions/authPasswordReset.action";
import styles from "./ResetRequestForm.module.css";

// Kept out of the "use server" action file: a file with "use server" at
// the top can only export async functions, not plain values — importing
// this object from there breaks the page at runtime (Next.js error "A
// 'use server' file can only export async functions, found object").
const INITIAL_STATE: RequestResetState = { kind: "idle" };

export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, INITIAL_STATE);

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
