"use client";

/**
 * MaintenanceToggleForm — client form for /admin/maintenance.
 *
 * Uses React 19's `useActionState` to display inline errors
 * returned by `toggleMaintenanceAction`. The form posts an
 * "enabled" flag (checkbox) plus an optional message textarea.
 */

import { useActionState } from "react";
import {
  toggleMaintenanceAction,
  type ToggleMaintenanceFormResult,
} from "@/app/actions/adminMaintenance.action";
import styles from "./page.module.css";

const initialState: ToggleMaintenanceFormResult | null = null;

interface Props {
  initialEnabled: boolean;
  initialMessage: string;
}

export function MaintenanceToggleForm({ initialEnabled, initialMessage }: Props) {
  const [state, formAction, isPending] = useActionState(
    toggleMaintenanceAction,
    initialState,
  );

  const errorText = state?.kind === "error" ? state.message ?? state.error : null;

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initialEnabled}
          className={styles.checkbox}
          disabled={isPending}
          data-testid="maintenance-toggle"
        />
        <span className={styles.label}>
          Enable maintenance mode (serve 503 to non-admins)
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Message shown to visitors (optional)</span>
        <textarea
          name="message"
          defaultValue={initialMessage}
          maxLength={500}
          rows={4}
          placeholder="We are upgrading the database. Please reload in a few minutes."
          className={styles.textarea}
          disabled={isPending}
        />
        <span className={styles.hint}>
          Up to 500 characters. Leave blank to use the default explanation on
          the 503 page.
        </span>
      </label>

      {errorText && (
        <p role="alert" className={styles.error}>
          {errorText}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Save maintenance settings"}
        </button>
      </div>
    </form>
  );
}