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
