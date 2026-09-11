/**
 * SubmitAssignmentButton — client submit control for /assignments.
 *
 * Calls the submit action for one row and renders the outcome
 * inline: a confirmation on success, a plain-spoken message on
 * failure. The server enforces ownership.
 */

"use client";

import { useActionState } from "react";
import {
  submitAssignmentAction,
  type SubmitAssignmentActionResult,
} from "@/app/actions/submitAssignment.action";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

type SubmitState = SubmitAssignmentActionResult | null;

const initialState: SubmitState = null;

const FAILURE_COPY: Record<string, string> = {
  unauthorized: "Please sign in to submit.",
  assignment_not_found: "That assignment is gone. Refresh the page.",
  not_assignee: "Only the assigned student can submit this.",
  invalid_status: "That assignment cannot move right now.",
  db_error: "Something went wrong saving. Try again.",
};

export function SubmitAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [state, formAction, isPending] = useActionState<SubmitState, FormData>(
    async () => submitAssignmentAction(assignmentId),
    initialState,
  );

  if (state && state.ok) {
    return (
      <p className={styles.confirmation} role="status">
        Submitted. Your instructor grades it next.
      </p>
    );
  }

  const errorText =
    state && !state.ok
      ? (FAILURE_COPY[state.error.kind] ?? "Something went wrong. Try again.")
      : null;

  return (
    <form action={formAction} className={styles.submitForm}>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Submitting..." : "Mark as done"}
      </Button>
      {errorText && (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      )}
    </form>
  );
}
