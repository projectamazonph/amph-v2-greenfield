"use client";

import { useState } from "react";
import { submitCapstoneAction } from "@/app/actions/capstone.action";
import styles from "./SubmitCapstoneButton.module.css";

/**
 * Submit button for /capstone. Posts once, disables while pending,
 * and surfaces the not_ready missing list inline without losing the
 * page. A successful submit reloads so the SUBMITTED state renders.
 */
export function SubmitCapstoneButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setPending(true);
    setError(null);
    try {
      const result = await submitCapstoneAction({ courseId: null });
      if (result.ok) {
        window.location.reload();
        return;
      }
      if (result.error.kind === "not_ready" && result.error.missingKinds) {
        setError(`Still missing: ${result.error.missingKinds.join(", ")}.`);
      } else {
        setError("Could not submit right now. Try again.");
      }
    } catch {
      setError("Could not submit right now. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.submit}
        disabled={pending}
        aria-busy={pending}
        onClick={() => void onSubmit()}
      >
        {pending ? "Submitting…" : "Submit capstone for review"}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
