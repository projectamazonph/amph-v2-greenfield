import rawClaims from "../../../content/curriculum/public-claims.json";

export type PublicSimulatorAvailability = "public-preview" | "enrolled-practice";

export interface PublicCurriculumClaims {
  readonly schemaVersion: 1;
  readonly courses: Readonly<Record<string, {
    readonly label: string;
    readonly tier: string;
    readonly moduleNumbers: readonly number[];
    readonly lessonCount: number;
    readonly plannedMinutes: number;
  }>>;
  readonly modules: readonly {
    readonly moduleNumber: number;
    readonly name: string;
    readonly courseSlug: string;
    readonly lessonCount: number;
    readonly plannedMinutes: number;
  }[];
  readonly simulators: Readonly<Record<string, {
    readonly label: string;
    readonly availability: PublicSimulatorAvailability;
  }>>;
  readonly tierSimulatorTargets: Readonly<Record<string, readonly string[]>>;
  readonly certificate: Readonly<{ label: string; claim: string }>;
}

/**
 * Reviewed public-product claims. Counts and minutes are deliberately kept in
 * a small config so public copy has one reviewable contract; the claim test
 * compares them with the source inventory on every CI run.
 */
export const PUBLIC_CURRICULUM_CLAIMS = rawClaims as PublicCurriculumClaims;

export function formatPlannedMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function publicCourseClaims(courseSlug: string) {
  const claims = PUBLIC_CURRICULUM_CLAIMS.courses[courseSlug];
  if (!claims) throw new Error(`Unknown public curriculum course: ${courseSlug}`);
  return claims;
}

export function publicSimulatorNamesForTier(tier: string): readonly string[] {
  const targets = PUBLIC_CURRICULUM_CLAIMS.tierSimulatorTargets[tier] ?? [];
  return targets.map((target) => PUBLIC_CURRICULUM_CLAIMS.simulators[target]?.label ?? target);
}
