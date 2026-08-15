/**
 * ResetConfirmForm — client component.
 *
 * Submits to resetPasswordAction. On success, shows a "password
 * changed" message with a link to /login. On error, shows the
 * kind returned by the use case.
 *
 * M-16 fix: the new-password field now uses the shared `Input`
 * primitive so the visual treatment (label / focus ring / height /
 * error styling) matches the rest of the auth surface (LoginForm,
 * SignupForm, AdminLoginForm, ResetRequestForm). The form-level
 * error message still renders as its own alert paragraph because the
 * server action returns a kind (invalid_token, expired_token,
 * weak_password, etc.) that is independent of the field state.
 */

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/authPasswordReset.action";
import { Input } from "@/components/ui";
import styles from "./ResetConfirmForm.module.css";

interface Props {
  token: string;
}

const INITIAL = { kind: "idle" as const };

export function ResetConfirmForm({ token }: Props) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, INITIAL);

  if (state.kind === "success") {
    return (
      <div className={styles.success} role="status">
        <p className={styles.successText}>Your password was changed. Sign in with the new one.</p>
        <Link href="/login" className={styles.cta}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <Input
        name="newPassword"
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        size="md"
      />
      {state.message ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
