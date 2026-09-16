/**
 * Pure first-decision helpers — no server-only code.
 *
 * The first-decision brief is the LEARN-014 onboarding route's
 * source of truth. The loader returns the reviewed wording; the
 * page renders it without further transformation.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface FirstDecisionBrief {
  readonly schemaVersion: 1;
  readonly title: string;
  readonly intro: string;
  readonly scenarioContext: string;
  readonly decisionRule: string;
  readonly resultExplanation: string;
}

export interface FirstDecisionBriefError {
  readonly kind: "brief_invalid";
  readonly message: string;
}

export function parseFirstDecisionBrief(
  raw: unknown,
): FirstDecisionBrief | FirstDecisionBriefError {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "brief_invalid", message: "Brief must be an object." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return { kind: "brief_invalid", message: "Brief schemaVersion must be 1." };
  }
  const fields: ReadonlyArray<keyof FirstDecisionBrief> = [
    "title",
    "intro",
    "scenarioContext",
    "decisionRule",
    "resultExplanation",
  ];
  for (const field of fields) {
    if (typeof obj[field] !== "string" || !(obj[field] as string).trim()) {
      return { kind: "brief_invalid", message: `Brief ${field} must be a non-empty string.` };
    }
  }
  return {
    schemaVersion: 1,
    title: (obj.title as string).trim(),
    intro: (obj.intro as string).trim(),
    scenarioContext: (obj.scenarioContext as string).trim(),
    decisionRule: (obj.decisionRule as string).trim(),
    resultExplanation: (obj.resultExplanation as string).trim(),
  };
}

export function loadFirstDecisionBrief(): FirstDecisionBrief {
  const path = resolve(process.cwd(), "content", "curriculum", "first-decision.json");
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = parseFirstDecisionBrief(parsed);
  if ("kind" in result) {
    throw new Error(`First decision brief is invalid: ${result.message}`);
  }
  return result;
}
