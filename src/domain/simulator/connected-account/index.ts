/**
 * Connected-Account Simulator — public exports.
 *
 * STORY-089. Sixth registered simulator, satisfies AGENTS.md Rule 5:
 *   - domain module here
 *   - registered in src/infra/simulator/buildSimulatorRegistry.ts
 *   - published SimulatorScenario row seeded by
 *     scripts/seed-simulator-scenarios.ts
 *   - simulator-registry validator at
 *     scripts/validate-simulator-registry.ts lists 6 simulators
 */

export { ConnectedAccountSimulator, gradeAttempt, __testOnly } from "./ConnectedAccountSimulator";
export type {
  ConnectedAccountInput,
  ConnectedAccountBidDecision,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
  ConnectedAccountKeyword,
  ConnectedAccountScenario,
  ConnectedAccountSearchTerm,
} from "./ConnectedAccountInput";
export type {
  ConnectedAccountOutput,
  ConnectedAccountKeywordResult,
  ConnectedAccountSearchTermResult,
  ConnectedAccountScoreDimensions,
} from "./ConnectedAccountOutput";
