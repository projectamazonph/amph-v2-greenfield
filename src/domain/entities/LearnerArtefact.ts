/**
 * LearnerArtefact — structured learner output (LEARN-033).
 *
 * Artefacts are the reviewable work a beginner accumulates: a
 * decision log entry, a listing audit, a keyword plan, a campaign
 * map, a triage report, and a weekly client readout. Backend for
 * LEARN-034 (tool-debrief autosave) and LEARN-035 (portfolio page).
 *
 * Lifecycle: DRAFT → SUBMITTED. A draft is freely revisable by the
 * owner. A submitted artefact is locked — the reviewable record
 * must not silently change under a reviewer. Access control lives
 * in the use cases (owner-only reads; admin reads for capstone
 * review in LEARN-044), not in this pure module.
 */

import { Result } from "@/domain/shared/Result";

export type ArtefactKind =
  | "decision-log"
  | "listing-audit"
  | "keyword-plan"
  | "campaign-map"
  | "triage-report"
  | "weekly-readout";

const ALL_KINDS: readonly ArtefactKind[] = [
  "decision-log",
  "listing-audit",
  "keyword-plan",
  "campaign-map",
  "triage-report",
  "weekly-readout",
];

export function isArtefactKind(value: string): value is ArtefactKind {
  return (ALL_KINDS as readonly string[]).includes(value);
}

export type ArtefactStatus = "DRAFT" | "SUBMITTED";

const ALL_STATUSES: readonly ArtefactStatus[] = ["DRAFT", "SUBMITTED"];

export function isArtefactStatus(value: string): value is ArtefactStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

/**
 * JSON-safe payload. Every kind requires a non-empty rationale; the
 * remaining fields are free-form so each tool debrief (LEARN-034) can
 * record its own scenario evidence without a schema migration.
 */
export interface ArtefactPayload {
  readonly rationale: string;
  readonly scenarioRef?: string;
  readonly fields?: Readonly<Record<string, string>>;
}

export interface LearnerArtefact {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string | null;
  readonly kind: ArtefactKind;
  readonly title: string;
  readonly scenarioRef: string | null;
  readonly payload: ArtefactPayload;
  readonly status: ArtefactStatus;
  readonly submittedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateArtefactError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_kind" }
  | { kind: "invalid_title" }
  | { kind: "invalid_rationale" };

export function createArtefact(params: {
  id: string;
  userId: string;
  courseId: string | null;
  kind: string;
  title: string;
  scenarioRef: string | null;
  payload: { rationale: string; scenarioRef?: string; fields?: Record<string, string> };
  createdById: string;
  createdAt?: Date;
}): Result<LearnerArtefact, CreateArtefactError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!isArtefactKind(params.kind)) {
    return Result.err({ kind: "invalid_kind" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_title" });
  }
  const rationale = params.payload.rationale;
  if (typeof rationale !== "string" || !rationale.trim()) {
    return Result.err({ kind: "invalid_rationale" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    kind: params.kind,
    title: params.title.trim(),
    scenarioRef: params.scenarioRef,
    payload: {
      rationale: rationale.trim(),
      ...(params.payload.scenarioRef !== undefined
        ? { scenarioRef: params.payload.scenarioRef }
        : {}),
      ...(params.payload.fields !== undefined ? { fields: params.payload.fields } : {}),
    },
    status: "DRAFT",
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

export type ReviseArtefactError =
  | { kind: "not_owner" }
  | { kind: "invalid_status" }
  | { kind: "invalid_title" }
  | { kind: "invalid_rationale" };

/**
 * The owner revises a DRAFT's title and payload. Submitted artefacts
 * are locked: a reviewable record must not silently change under a
 * reviewer. Revision after submit goes through a new artefact row
 * (a future LEARN-043 submission-revision story), not this path.
 */
export function reviseArtefact(
  artefact: LearnerArtefact,
  params: {
    revisedById: string;
    title: string;
    payload: { rationale: string; scenarioRef?: string; fields?: Record<string, string> };
    revisedAt: Date;
  },
): Result<LearnerArtefact, ReviseArtefactError> {
  if (params.revisedById !== artefact.userId) {
    return Result.err({ kind: "not_owner" });
  }
  if (artefact.status !== "DRAFT") {
    return Result.err({ kind: "invalid_status" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_title" });
  }
  if (typeof params.payload.rationale !== "string" || !params.payload.rationale.trim()) {
    return Result.err({ kind: "invalid_rationale" });
  }
  return Result.ok({
    ...artefact,
    title: params.title.trim(),
    payload: {
      rationale: params.payload.rationale.trim(),
      ...(params.payload.scenarioRef !== undefined
        ? { scenarioRef: params.payload.scenarioRef }
        : {}),
      ...(params.payload.fields !== undefined ? { fields: params.payload.fields } : {}),
    },
    updatedAt: params.revisedAt,
    updatedById: params.revisedById,
  });
}

export type SubmitArtefactError = { kind: "not_owner" } | { kind: "invalid_status" };

/**
 * The owner locks a DRAFT for review. Anything else — already
 * submitted — is rejected so a submission is always a forward move.
 */
export function submitArtefact(
  artefact: LearnerArtefact,
  params: { submittedById: string; submittedAt: Date },
): Result<LearnerArtefact, SubmitArtefactError> {
  if (params.submittedById !== artefact.userId) {
    return Result.err({ kind: "not_owner" });
  }
  if (artefact.status !== "DRAFT") {
    return Result.err({ kind: "invalid_status" });
  }
  return Result.ok({
    ...artefact,
    status: "SUBMITTED",
    submittedAt: params.submittedAt,
    updatedAt: params.submittedAt,
  });
}
