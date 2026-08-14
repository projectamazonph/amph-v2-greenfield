"use client";

/**
 * DisableTwoFactorForm — M5 fix for admin settings page.
 *
 * Uses useActionState instead of the ?error= query-string pattern.
 * Errors are displayed inline under the offending field.
 */

import { useActionState } from "react";
import { disableTwoFactorForFormAction, type DisableTwoFactorFormResult } from "@/app/actions/twoFactor.action";
import styles from "./DisableTwoFactorForm.module.css";

const errorMessage: Record<string, string> = {
  wrong_password: "Incorrect password. Two-factor authentication was not disabled.",
  not_authenticated: "Your session expired. Please sign in again.",
  user_not_found: "Could not find your account. Please sign in again.",
  db_error: "Could not save your changes right now. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

function mapError(kind: string | undefined): string {
  if (kind && kind in errorMessage) {
    return errorMessage[kind] as string;
  }
  return "Something went wrong. Please try again.";
}

const initialState: DisableTwoFactorFormResult | null = null;

export function DisableTwoFactorForm() {
  const [state, formAction, isPending] = useActionState(
    disableTwoFactorForFormAction,
    initialState,
  );

  // On success, reload the page to reflect the 2FA disabled state
  if (state?.kind === "success") {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return (
      <p className={styles.successMessage} role="status">
        Two-factor authentication has been disabled.
      </p>
    );
  }

  const errorText = state?.kind === "error" ? mapError(state.error) : null;

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Current password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={styles.input}
          placeholder="Enter your password"
          aria-describedby={errorText ? "disable-2fa-error" : undefined}
        />
        <span className={styles.hint}>
          Confirms it is really you before turning this off.
        </span>
      </label>

      {errorText && (
        <p id="disable-2fa-error" className={styles.error} role="alert">
          {errorText}
        </p>
      )}

      <button
        type="submit"
        className={styles.dangerButton}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Disabling..." : "Disable two-factor authentication"}
      </button>
    </form>
  );
}
