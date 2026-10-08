/**
 * UserDiagnosticResult — value object representing a student's stored
 * pre-course diagnostic outcome and completion timestamp.
 */

export type DiagnosticOutcome = "new" | "familiar" | "experienced";

const OUTCOME_IDS: readonly DiagnosticOutcome[] = ["new", "familiar", "experienced"];

export function isDiagnosticOutcome(value: unknown): value is DiagnosticOutcome {
  return typeof value === "string" && (OUTCOME_IDS as readonly string[]).includes(value);
}

export interface UserDiagnosticResult {
  readonly outcome: DiagnosticOutcome;
  readonly completedAt: Date;
}

/**
 * Pure domain helper that maps a DiagnosticOutcome (or raw value)
 * and optional timestamp to a frozen UserDiagnosticResult payload.
 */
export function createDiagnosticResult(
  rawOutcome: unknown,
  completedAt: Date = new Date(),
): UserDiagnosticResult {
  const outcome: DiagnosticOutcome = isDiagnosticOutcome(rawOutcome) ? rawOutcome : "familiar";
  const validCompletedAt =
    completedAt instanceof Date && !isNaN(completedAt.getTime()) ? completedAt : new Date();

  return Object.freeze({
    outcome,
    completedAt: validCompletedAt,
  });
}
