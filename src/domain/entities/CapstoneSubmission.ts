/**
 * CapstoneSubmission — Foundations capstone lifecycle (LEARN-043).
 *
 * Statuses: DRAFT → SUBMITTED → NEEDS_REVISION → SUBMITTED → PASSED.
 * The owner submits and re-submits; a reviewer returns for revision
 * (note required) or passes (six artefact ids required). Passing
 * records completion evidence only — never an employment claim.
 * Reviewer identity and scoring UI belong to LEARN-044; this module
 * only guards the transitions.
 */

import { Result } from "@/domain/shared/Result";

export type CapstoneStatus = "DRAFT" | "SUBMITTED" | "NEEDS_REVISION" | "PASSED";

const ALL_STATUSES: readonly CapstoneStatus[] = ["DRAFT", "SUBMITTED", "NEEDS_REVISION", "PASSED"];

export function isCapstoneStatus(value: string): value is CapstoneStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

export interface CapstoneSubmission {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string | null;
  readonly status: CapstoneStatus;
  /** Artefact ids attached at submit time (snapshot, not a live query). */
  readonly artefactIds: readonly string[];
  /** Reviewer note recorded on NEEDS_REVISION. Null otherwise. */
  readonly reviewerNote: string | null;
  readonly submittedAt: Date | null;
  readonly decidedAt: Date | null;
  readonly decidedById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateCapstoneError = { kind: "invalid_user_id" };

export function createCapstone(params: {
  id: string;
  userId: string;
  courseId: string | null;
  createdById: string;
  createdAt?: Date;
}): Result<CapstoneSubmission, CreateCapstoneError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    status: "DRAFT",
    artefactIds: [],
    reviewerNote: null,
    submittedAt: null,
    decidedAt: null,
    decidedById: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

export type SubmitCapstoneError =
  | { kind: "not_owner" }
  | { kind: "invalid_status" }
  | { kind: "not_ready"; missingKinds: readonly string[] };

/**
 * Owner submits a DRAFT or NEEDS_REVISION row with the artefact ids
 * under review. Readiness (all six kinds present) is checked by the
 * caller via checkCapstoneReadiness and passed in as missingKinds;
 * a non-empty list rejects the submit so a submission always carries
 * the full evidence set.
 */
export function submitCapstone(
  submission: CapstoneSubmission,
  params: {
    submittedById: string;
    artefactIds: readonly string[];
    missingKinds: readonly string[];
    submittedAt: Date;
  },
): Result<CapstoneSubmission, SubmitCapstoneError> {
  if (params.submittedById !== submission.userId) {
    return Result.err({ kind: "not_owner" });
  }
  if (submission.status !== "DRAFT" && submission.status !== "NEEDS_REVISION") {
    return Result.err({ kind: "invalid_status" });
  }
  if (params.missingKinds.length > 0) {
    return Result.err({ kind: "not_ready", missingKinds: [...params.missingKinds] });
  }
  if (params.artefactIds.length === 0) {
    return Result.err({ kind: "not_ready", missingKinds: [...params.missingKinds] });
  }
  return Result.ok({
    ...submission,
    status: "SUBMITTED",
    artefactIds: [...params.artefactIds],
    reviewerNote: null,
    submittedAt: params.submittedAt,
    updatedAt: params.submittedAt,
    updatedById: params.submittedById,
  });
}

export type ReturnCapstoneError = { kind: "invalid_status" } | { kind: "missing_note" };

/**
 * Reviewer returns a SUBMITTED row for revision. A note is required
 * so the learner knows what to fix. Owner identity is enforced by
 * the use case (reviewer ≠ owner); the domain only guards status.
 */
export function returnCapstoneForRevision(
  submission: CapstoneSubmission,
  params: { reviewerId: string; note: string; decidedAt: Date },
): Result<CapstoneSubmission, ReturnCapstoneError> {
  if (submission.status !== "SUBMITTED") {
    return Result.err({ kind: "invalid_status" });
  }
  if (!params.note.trim()) {
    return Result.err({ kind: "missing_note" });
  }
  return Result.ok({
    ...submission,
    status: "NEEDS_REVISION",
    reviewerNote: params.note.trim(),
    decidedAt: params.decidedAt,
    decidedById: params.reviewerId,
    updatedAt: params.decidedAt,
    updatedById: params.reviewerId,
  });
}

export type PassCapstoneError = { kind: "invalid_status" } | { kind: "missing_artefacts" };

/**
 * Reviewer marks a SUBMITTED row PASSED. Six artefact ids are
 * required — the rubric cannot be scored against an incomplete
 * evidence set. Scoring itself is LEARN-044.
 */
export function passCapstone(
  submission: CapstoneSubmission,
  params: { reviewerId: string; decidedAt: Date },
): Result<CapstoneSubmission, PassCapstoneError> {
  if (submission.status !== "SUBMITTED") {
    return Result.err({ kind: "invalid_status" });
  }
  if (submission.artefactIds.length < 6) {
    return Result.err({ kind: "missing_artefacts" });
  }
  return Result.ok({
    ...submission,
    status: "PASSED",
    decidedAt: params.decidedAt,
    decidedById: params.reviewerId,
    updatedAt: params.decidedAt,
    updatedById: params.reviewerId,
  });
}
