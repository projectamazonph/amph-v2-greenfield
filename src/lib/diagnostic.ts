/**
 * Pure diagnostic helpers — no server-only code.
 *
 * The pure scoring function and manifest loader live here so unit
 * tests can import them without pulling in `"use server"` modules.
 * The server action file re-exports the loader to keep the public
 * API at `@/app/actions/diagnostic.action`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type DiagnosticOutcome = "new" | "familiar" | "experienced";

export interface DiagnosticOutcomeView {
  readonly id: DiagnosticOutcome;
  readonly label: string;
  readonly summary: string;
  readonly startingEmphasis: string;
}

export interface DiagnosticQuestionOption {
  readonly value: string;
  readonly label: string;
}

export interface DiagnosticQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly DiagnosticQuestionOption[];
}

export interface DiagnosticRubricOutcome {
  readonly id: DiagnosticOutcome;
  readonly label: string;
  readonly summary: string;
  readonly startingEmphasis: string;
  readonly score: Readonly<Record<string, readonly string[]>>;
}

export interface DiagnosticManifest {
  readonly schemaVersion: 1;
  readonly title: string;
  readonly intro: string;
  readonly questions: readonly DiagnosticQuestion[];
  readonly rubric: {
    readonly outcomes: readonly DiagnosticRubricOutcome[];
    readonly fallbackOutcome: DiagnosticOutcome;
  };
}

export interface DiagnosticManifestError {
  readonly kind: "manifest_invalid";
  readonly message: string;
}

const OUTCOME_IDS: readonly DiagnosticOutcome[] = ["new", "familiar", "experienced"];

export function isDiagnosticOutcome(value: unknown): value is DiagnosticOutcome {
  return typeof value === "string" && (OUTCOME_IDS as readonly string[]).includes(value);
}

export function parseDiagnosticManifest(
  raw: unknown,
): DiagnosticManifest | DiagnosticManifestError {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "manifest_invalid", message: "Manifest must be an object." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return { kind: "manifest_invalid", message: "Manifest schemaVersion must be 1." };
  }
  if (typeof obj.title !== "string" || typeof obj.intro !== "string") {
    return {
      kind: "manifest_invalid",
      message: "Manifest must include title and intro strings.",
    };
  }
  if (!Array.isArray(obj.questions)) {
    return { kind: "manifest_invalid", message: "Manifest questions must be an array." };
  }
  if (typeof obj.rubric !== "object" || obj.rubric === null) {
    return { kind: "manifest_invalid", message: "Manifest rubric must be an object." };
  }
  const rubric = obj.rubric as Record<string, unknown>;
  if (!Array.isArray(rubric.outcomes)) {
    return { kind: "manifest_invalid", message: "Rubric outcomes must be an array." };
  }
  if (!isDiagnosticOutcome(rubric.fallbackOutcome)) {
    return {
      kind: "manifest_invalid",
      message: "Rubric fallbackOutcome must be one of the three outcomes.",
    };
  }
  return raw as DiagnosticManifest;
}

export function loadDiagnosticManifest(): DiagnosticManifest {
  const path = resolve(process.cwd(), "content", "curriculum", "diagnostic.json");
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = parseDiagnosticManifest(parsed);
  if ("kind" in result) {
    throw new Error(`Diagnostic manifest is invalid: ${result.message}`);
  }
  return result;
}

/**
 * Pure scoring function. Reads the manifest and the answered values
 * map, then returns the matching outcome. The first outcome whose
 * score map matches every answered question wins; ties and partial
 * answers go to the rubric's fallback outcome.
 *
 * The function is intentionally pure so it can be unit-tested
 * without any filesystem or framework dependency.
 */
export function scoreDiagnostic(
  manifest: DiagnosticManifest,
  answers: Readonly<Record<string, string>>,
): DiagnosticOutcomeView {
  const answeredKeys = manifest.questions.map((q) => q.id);
  const allAnswered = answeredKeys.every((key) => typeof answers[key] === "string");

  if (!allAnswered) {
    return outcomeView(manifest, manifest.rubric.fallbackOutcome);
  }

  for (const outcome of manifest.rubric.outcomes) {
    const matches = answeredKeys.every((key) => {
      const accepted = outcome.score[key];
      const answer = answers[key];
      if (!accepted || answer === undefined) return false;
      return accepted.includes(answer);
    });
    if (matches) return outcomeView(manifest, outcome.id);
  }

  return outcomeView(manifest, manifest.rubric.fallbackOutcome);
}

function outcomeView(
  manifest: DiagnosticManifest,
  outcomeId: DiagnosticOutcome,
): DiagnosticOutcomeView {
  const outcome = manifest.rubric.outcomes.find((o) => o.id === outcomeId);
  if (!outcome) {
    throw new Error(`Outcome ${outcomeId} not found in diagnostic manifest`);
  }
  return {
    id: outcome.id,
    label: outcome.label,
    summary: outcome.summary,
    startingEmphasis: outcome.startingEmphasis,
  };
}
