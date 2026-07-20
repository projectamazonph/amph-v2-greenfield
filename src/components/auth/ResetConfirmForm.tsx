/**
 * ResetConfirmForm — client component.
 *
 * Submits to resetPasswordAction. On success, shows a "password
 * changed" message with a link to /login. On error, shows the
 * kind returned by the use case.
 */

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/authPasswordReset.action";
import styles from "./ResetConfirmForm.module.css";

interface Props {
  token: string;
}

const INITIAL = { kind: "idle" as const };

export function ResetConfirmForm({ token }: Props) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, INITIAL);

  if (state.kind === "success") {
    return (
      <div className={styles.success}>
        <p className={styles.successText}>
          Your password was changed. Sign in with the new one.
        </p>
        <Link href="/login" className={styles.cta}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <label className={styles.label} htmlFor="rp-newpassword">
        New password
      </label>
      <input
        id="rp-newpassword"
        name="newPassword"
        type="password"
        required
        className={styles.input}
        autoComplete="new-password"
        minLength={8}
      />
      {state.message ? <p className={styles.error}>{state.message}</p> : null}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
