/**
 * Plain-language fallback copy for transient student-facing failures.
 *
 * These messages explain what was protected and what the student can do
 * next. Domain-specific errors still map to their own more precise copy.
 */
export const studentErrorCopy = {
  quizSubmit: "Your answers were not saved. Check your connection and submit again.",
  simulatorRun:
    "The simulator could not complete this attempt. Your answers were not saved. Check your connection and try again.",
  simulatorGrade:
    "Your work is still on this page, but it was not graded. Check your connection and try again.",
  enrollment: "Enrollment did not finish. Your account was not charged. Refresh and try again.",
  rsvp: "We could not update your RSVP right now. Your enrollment was not changed. Refresh and try again.",
  recording:
    "We could not save your progress right now. Your watch status is unchanged. Refresh and try again.",
  exportData:
    "We could not prepare your data file. Your account was not changed. Check your connection and try again.",
} as const;

// ── Simulator error-kind → student copy maps ────────────────────────────────
//
// Every simulator server action (`src/app/tools/<name>/actions.ts`) calls four
// use cases (StartSimulatorAttempt, SubmitSimulatorAttempt,
// GradeSimulatorAttempt, ComposeAttemptFeedback) that return Result.err with a
// `kind` enum. Previously the action files fell through to the raw kind string
// (`message: result.error.kind`) and surfaced codes like "policy_not_found"
// straight to the student UI. These maps translate every known kind to a
// human-readable message; anything not mapped falls through to a generic
// fallback.
//
// To add a new use-case error kind, add an entry to the right map below.

const FRIENDLY_GRADING: Record<string, string> = {
  policy_not_found: "This exercise is being prepared. Please check back shortly.",
  attempt_not_submitted: "Save your decisions before submitting.",
  attempt_already_graded: "This attempt has already been graded.",
  invalid_dimensions: "We couldn't score this attempt. Please try again.",
  db_error: "We couldn't save your results. Please try again.",
};

const FRIENDLY_ATTEMPT: Record<string, string> = {
  scenario_not_found: "This exercise is being prepared. Please check back shortly.",
  already_in_progress: "You already have an attempt in progress for this exercise.",
  challenge_locked: "Finish a practice attempt to unlock Challenge mode.",
  mode_not_allowed: "That mode isn't available yet.",
  db_error: "We couldn't start your attempt. Please try again.",
};

const FRIENDLY_FEEDBACK: Record<string, string> = {
  attempt_not_found: "We couldn't find this attempt.",
  attempt_not_graded: "This attempt hasn't been graded yet.",
  policy_not_found: "This exercise is being prepared. Please check back shortly.",
  db_error: "We couldn't compose feedback. Please try again.",
};

/**
 * Maps a use-case error kind to a student-facing message.
 * Add a `kind` arg to one of the maps above when a use case gains a new error.
 */
export function friendlySimulatorError(
  kind: string,
  context: "attempt" | "grading" | "feedback",
): string {
  const map =
    context === "grading"
      ? FRIENDLY_GRADING
      : context === "feedback"
        ? FRIENDLY_FEEDBACK
        : FRIENDLY_ATTEMPT;
  return (
    map[kind] ??
    (context === "grading"
      ? "We couldn't grade this attempt. Please try again."
      : context === "feedback"
        ? "We couldn't compose feedback. Please try again."
        : "We couldn't start your attempt. Please try again.")
  );
}
