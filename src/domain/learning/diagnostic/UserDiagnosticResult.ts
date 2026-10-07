/**
 * UserDiagnosticResult — value object representing a student's stored
 * pre-course diagnostic outcome and completion timestamp.
 */

import { isDiagnosticOutcome, type DiagnosticOutcome } from "@/lib/diagnostic";

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
