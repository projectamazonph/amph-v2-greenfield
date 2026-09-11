/**
 * GradeAssignmentForm — client form for the assignment detail page.
 *
 * Posts to `gradeAssignmentAction` and renders inline errors.
 */

"use client";

import { useActionState } from "react";
import {
  gradeAssignmentAction,
  type AdminAssignmentFormResult,
} from "@/app/actions/adminAssignment.action";
import styles from "../page.module.css";

const initialState: AdminAssignmentFormResult | null = null;

export function GradeAssignmentForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction, isPending] = useActionState(
    gradeAssignmentAction,
    initialState,
  );

  const errorText = state?.kind === "error" ? (state.message ?? state.error) : null;

  return (
    <form action={formAction} className={styles.form}>
      <h2 className={styles.sectionTitle}>Grade this submission</h2>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className={styles.field}>
        <span className={styles.label}>Grade (0 to 100)</span>
        <input
          type="number"
          name="grade"
          required
          min={0}
          max={100}
          step={1}
          placeholder="85"
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Feedback for the student</span>
        <textarea
          name="feedback"
          rows={4}
          placeholder="What was strong, and the one thing to fix next time."
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      {errorText && (
        <p role="alert" className={styles.error}>
          {errorText}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.filterButton}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Save grade"}
        </button>
      </div>
    </form>
  );
}
