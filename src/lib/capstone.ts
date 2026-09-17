/**
 * Capstone manifest loader (LEARN-042).
 *
 * Filesystem access lives here, not in domain/. Pure types, parse,
 * and readiness live in `@/domain/services/Capstone` so use cases
 * can depend on them without a lib import (dependency-direction
 * rule). Pages and actions import the loader from here.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseCapstoneManifest,
  type CapstoneCriterion,
  type CapstoneDeliverable,
  type CapstoneManifest,
  type CapstoneManifestError,
  type CapstoneReadiness,
} from "@/domain/services/Capstone";

export type {
  CapstoneCriterion,
  CapstoneDeliverable,
  CapstoneManifest,
  CapstoneManifestError,
  CapstoneReadiness,
};
export {
  checkCapstoneReadiness,
  checkKindReadiness,
  parseCapstoneManifest,
} from "@/domain/services/Capstone";

export function loadCapstoneManifest(): CapstoneManifest {
  const path = resolve(process.cwd(), "content", "curriculum", "capstone.json");
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = parseCapstoneManifest(parsed);
  if ("kind" in result) {
    throw new Error(`Capstone manifest is invalid: ${result.message}`);
  }
  return result;
}
