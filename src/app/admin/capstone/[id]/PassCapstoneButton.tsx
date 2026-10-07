"use client";

import { useState } from "react";
import { passCapstoneAction } from "@/app/actions/capstone-review.action";
import styles from "./ReviewForms.module.css";

/**
 * Pass button. The six-artefact gate is enforced server-side; the
 * button only renders on SUBMITTED rows (the page guarantees it).
 */
export function PassCapstoneButton({ submissionId }: { submissionId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPass() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await passCapstoneAction({ submissionId });
      if (result.ok) {
        window.location.reload();
        return;
      }
      setError(
        result.error.kind === "missing_artefacts"
          ? "Six artefacts are required before passing."
          : "Could not pass right now. Try again.",
      );
    } catch {
      setError("Could not pass right now. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.form}>
      <button
        type="button"
        className={styles.primary}
        disabled={pending}
        aria-busy={pending}
        onClick={() => void onPass()}
      >
        {pending ? "Passing…" : "Mark passed"}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
