/**
 * SimGrid bridge protocol — the postMessage wire format the vendored
 * static site sends to the AMPH wrapper page after a student finishes
 * an attempt.
 *
 * Wire format (confirmed in public/simgrid-v1/assets/student-progress.js):
 *   window.opener.postMessage({
 *     source: 'simhub-static-bridge',
 *     kind: 'simulator_attempt',
 *     token: <string from ?simhubBridgeToken=...>,
 *     attempt: {
 *       simulatorId, scenarioVersion, rubricVersion,
 *       score, passed, completedAt,
 *       scenarioId?, policyVersion?
 *     }
 *   }, returnOrigin);
 *
 * The token field is typed `string` (not narrowed to the constant) so
 * the guard stays useful for any forward-compatible bridge variant.
 * The wrapper page always emits SIMGRID_BRIDGE_TOKEN.
 */
import { isSimgridSimulatorId } from "@/domain/simgrid";

export const SIMGRID_BRIDGE_SOURCE = "simhub-static-bridge" as const;
export const SIMGRID_BRIDGE_KIND_ATTEMPT = "simulator_attempt" as const;
export const SIMGRID_BRIDGE_TOKEN = "amph-bridge" as const;

export interface SimgridBridgeAttempt {
  readonly simulatorId: string;
  readonly scenarioVersion: string;
  readonly rubricVersion: string;
  readonly score: number;
  readonly passed: boolean;
  readonly completedAt: string;
  readonly scenarioId?: string;
  readonly policyVersion?: string;
}

export interface SimgridBridgeMessage {
  readonly source: typeof SIMGRID_BRIDGE_SOURCE;
  readonly kind: typeof SIMGRID_BRIDGE_KIND_ATTEMPT;
  readonly token: string;
  readonly attempt: SimgridBridgeAttempt;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  // Reject strings that Date.parse accepts but that are not ISO 8601.
  // We require an explicit "T" separator so plain date strings like
  // "2026-09-30" or RFC 2822 strings do not slip through.
  return value.includes("T");
}

function isBridgeAttempt(value: unknown): value is SimgridBridgeAttempt {
  if (!isObject(value)) return false;
  if (!isSimgridSimulatorId(value.simulatorId)) return false;
  if (typeof value.scenarioVersion !== "string" || value.scenarioVersion.length === 0) return false;
  if (typeof value.rubricVersion !== "string" || value.rubricVersion.length === 0) return false;
  if (
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    value.score > 100
  ) {
    return false;
  }
  if (typeof value.passed !== "boolean") return false;
  if (!isIsoTimestamp(value.completedAt)) return false;
  if (value.scenarioId !== undefined && typeof value.scenarioId !== "string") return false;
  if (value.policyVersion !== undefined && typeof value.policyVersion !== "string") return false;
  return true;
}

export function isSimgridBridgeMessage(value: unknown): value is SimgridBridgeMessage {
  if (!isObject(value)) return false;
  if (value.source !== SIMGRID_BRIDGE_SOURCE) return false;
  if (value.kind !== SIMGRID_BRIDGE_KIND_ATTEMPT) return false;
  if (typeof value.token !== "string") return false;
  if (!isBridgeAttempt(value.attempt)) return false;
  return true;
}
