/**
 * Pure capstone helpers (LEARN-042, LEARN-043).
 *
 * The brief and rubric are reviewed content; the readiness check is
 * a pure set comparison. No filesystem access here — the manifest
 * loader lives in `@/lib/capstone`, and use cases receive the
 * required kinds as plain input (diagnostic-action precedent).
 */

export interface CapstoneDeliverable {
  readonly id: string;
  readonly label: string;
  readonly artefactKind: string;
  readonly summary: string;
}

export interface CapstoneCriterion {
  readonly id: string;
  readonly label: string;
  readonly artefactKind: string;
  readonly goodLooksLike: string;
}

export interface CapstoneManifest {
  readonly schemaVersion: 1;
  readonly title: string;
  readonly intro: string;
  readonly deliverables: readonly CapstoneDeliverable[];
  readonly rubric: {
    readonly pointsPerCriterion: number;
    readonly passThreshold: number;
    readonly criteria: readonly CapstoneCriterion[];
  };
}

export interface CapstoneManifestError {
  readonly kind: "manifest_invalid";
  readonly message: string;
}

export interface CapstoneReadiness {
  readonly ready: boolean;
  readonly requiredKinds: readonly string[];
  readonly submittedKinds: readonly string[];
  readonly missingKinds: readonly string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseCapstoneManifest(raw: unknown): CapstoneManifest | CapstoneManifestError {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "manifest_invalid", message: "Manifest must be an object." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return { kind: "manifest_invalid", message: "Manifest schemaVersion must be 1." };
  }
  if (!isNonEmptyString(obj.title) || !isNonEmptyString(obj.intro)) {
    return {
      kind: "manifest_invalid",
      message: "Manifest must include title and intro strings.",
    };
  }
  if (!Array.isArray(obj.deliverables) || obj.deliverables.length === 0) {
    return {
      kind: "manifest_invalid",
      message: "Manifest deliverables must be a non-empty array.",
    };
  }
  for (const deliverable of obj.deliverables as readonly unknown[]) {
    if (typeof deliverable !== "object" || deliverable === null) {
      return { kind: "manifest_invalid", message: "Every deliverable must be an object." };
    }
    const d = deliverable as Record<string, unknown>;
    if (
      !isNonEmptyString(d.id) ||
      !isNonEmptyString(d.label) ||
      !isNonEmptyString(d.artefactKind)
    ) {
      return {
        kind: "manifest_invalid",
        message: "Every deliverable needs an id, label, and artefactKind.",
      };
    }
  }
  if (typeof obj.rubric !== "object" || obj.rubric === null) {
    return { kind: "manifest_invalid", message: "Manifest rubric must be an object." };
  }
  const rubric = obj.rubric as Record<string, unknown>;
  if (typeof rubric.pointsPerCriterion !== "number" || typeof rubric.passThreshold !== "number") {
    return {
      kind: "manifest_invalid",
      message: "Rubric needs numeric pointsPerCriterion and passThreshold.",
    };
  }
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return { kind: "manifest_invalid", message: "Rubric criteria must be a non-empty array." };
  }
  for (const criterion of rubric.criteria as readonly unknown[]) {
    if (typeof criterion !== "object" || criterion === null) {
      return { kind: "manifest_invalid", message: "Every criterion must be an object." };
    }
    const c = criterion as Record<string, unknown>;
    if (
      !isNonEmptyString(c.id) ||
      !isNonEmptyString(c.label) ||
      !isNonEmptyString(c.artefactKind) ||
      !isNonEmptyString(c.goodLooksLike)
    ) {
      return {
        kind: "manifest_invalid",
        message: "Every criterion needs id, label, artefactKind, and goodLooksLike.",
      };
    }
  }
  return raw as CapstoneManifest;
}

/**
 * Core set comparison. Unknown and blank kinds are ignored;
 * duplicates collapse. Ready means every required kind is present.
 */
export function checkKindReadiness(
  requiredKinds: readonly string[],
  submittedKinds: readonly string[],
): CapstoneReadiness {
  const required = requiredKinds.filter((kind) => kind.trim().length > 0);
  const submitted = new Set<string>();
  for (const kind of submittedKinds) {
    if (typeof kind === "string" && kind.trim().length > 0) {
      submitted.add(kind.trim());
    }
  }
  const missingKinds = required.filter((kind) => !submitted.has(kind));
  return {
    ready: missingKinds.length === 0,
    requiredKinds: [...required],
    submittedKinds: [...submitted].sort(),
    missingKinds,
  };
}

/**
 * Manifest-backed check. Derives the required kinds from the
 * deliverables, then delegates to the core comparison.
 */
export function checkCapstoneReadiness(
  manifest: CapstoneManifest,
  submittedKinds: readonly string[],
): CapstoneReadiness {
  return checkKindReadiness(
    manifest.deliverables.map((d) => d.artefactKind),
    submittedKinds,
  );
}
