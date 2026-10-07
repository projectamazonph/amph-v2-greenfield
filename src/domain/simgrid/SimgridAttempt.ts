import type { SimgridSimulatorId } from "./SimgridSimulatorId";

/**
 * SimgridAttempt — a single attempt at a SimGrid static simulator,
 * persisted from the vendored postMessage bridge.
 *
 * Story: ADR-026 (SimGrid integration). The score is on the
 * 0..100 scale the bridge sends; passing/failing is whatever
 * the bridge declared.
 */
export interface SimgridAttempt {
  readonly id: string; // ULID
  readonly userId: string;
  readonly simulatorId: SimgridSimulatorId;
  readonly score: number; // 0..100
  readonly passed: boolean;
  readonly completedAt: Date;
  readonly scenarioVersion: string;
  readonly rubricVersion: string;
  readonly scenarioId?: string;
  readonly policyVersion?: string;
}
