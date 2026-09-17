"use client";

import { useState } from "react";
import { returnCapstoneAction } from "@/app/actions/capstone-review.action";
import styles from "./ReviewForms.module.css";

/**
 * Return-for-revision form. The note is required by the domain;
 * the button stays disabled while it is blank.
 */
export function ReturnCapstoneForm({ submissionId }: { submissionId: string }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaId = `return-note-${submissionId}`;

  async function onSubmit() {
    if (note.trim().length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await returnCapstoneAction({ submissionId, note: note.trim() });
      if (result.ok) {
        window.location.reload();
        return;
      }
      setError(
        result.error.kind === "missing_note"
          ? "Write what the learner should fix first."
          : "Could not return right now. Try again.",
      );
    } catch {
      setError("Could not return right now. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.form}>
      <label htmlFor={textareaId} className={styles.label}>
        Return for revision
      </label>
      <p className={styles.hint}>
        Tell the learner exactly what to fix. They see this note on their capstone page.
      </p>
      <textarea
        id={textareaId}
        className={styles.textarea}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Name the deliverable and the concrete fix."
      />
      <button
        type="button"
        className={styles.secondary}
        disabled={note.trim().length === 0 || pending}
        aria-busy={pending}
        onClick={() => void onSubmit()}
      >
        {pending ? "Returning…" : "Return for revision"}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
