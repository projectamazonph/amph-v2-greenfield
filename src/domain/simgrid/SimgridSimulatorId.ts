/**
 * SimgridSimulatorId — the simulator ids that the vendored SimGrid
 * static site can report through its postMessage bridge.
 *
 * Mirrors the catalog at public/simgrid-v1/index.html and the
 * `simulatorId` values that student-progress.js sends in
 * `attempt.simulatorId`.
 *
 * Add to this union (and to SIMGRID_SIMULATOR_IDS, keeping
 * alphabetical order) when the vendored catalog gains a new entry.
 */

export type SimgridSimulatorId =
  | "ad-console"
  | "bid-decisions"
  | "bulk-file"
  | "campaign-architect"
  | "capstone-sequence"
  | "client-onboarding"
  | "keyword-lab"
  | "listing"
  | "pacing-deck"
  | "search-triage"
  | "sqp-studio"
  | "account-audit";

export const SIMGRID_SIMULATOR_IDS = [
  "account-audit",
  "ad-console",
  "bid-decisions",
  "bulk-file",
  "campaign-architect",
  "capstone-sequence",
  "client-onboarding",
  "keyword-lab",
  "listing",
  "pacing-deck",
  "search-triage",
  "sqp-studio",
] as const satisfies readonly SimgridSimulatorId[];

export function isSimgridSimulatorId(value: unknown): value is SimgridSimulatorId {
  return typeof value === "string" && (SIMGRID_SIMULATOR_IDS as readonly string[]).includes(value);
}
