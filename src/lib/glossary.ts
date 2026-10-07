/**
 * Pure glossary helpers — no server-only code.
 *
 * The glossary is the source of truth for the just-in-time term
 * popovers in Module 0 (LEARN-013). The loader returns the
 * reviewed definitions; the renderer in `src/components/lesson`
 * binds them to the inline term buttons emitted by the directive
 * plugin.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface GlossaryTerm {
  readonly slug: string;
  readonly term: string;
  readonly shortDefinition: string;
  readonly longDefinition: string;
}

export interface GlossaryManifest {
  readonly schemaVersion: 1;
  readonly terms: readonly GlossaryTerm[];
}

export interface GlossaryManifestError {
  readonly kind: "manifest_invalid";
  readonly message: string;
}

export function parseGlossaryManifest(raw: unknown): GlossaryManifest | GlossaryManifestError {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "manifest_invalid", message: "Manifest must be an object." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return { kind: "manifest_invalid", message: "Manifest schemaVersion must be 1." };
  }
  if (!Array.isArray(obj.terms)) {
    return { kind: "manifest_invalid", message: "Manifest terms must be an array." };
  }
  const seen = new Set<string>();
  const terms: GlossaryTerm[] = [];
  for (const raw of obj.terms as readonly unknown[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const t = raw as Record<string, unknown>;
    const slug = typeof t.slug === "string" ? t.slug.trim() : "";
    const term = typeof t.term === "string" ? t.term.trim() : "";
    const shortDefinition = typeof t.shortDefinition === "string" ? t.shortDefinition.trim() : "";
    const longDefinition = typeof t.longDefinition === "string" ? t.longDefinition.trim() : "";
    if (!slug || !term || !shortDefinition || !longDefinition) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    terms.push({ slug, term, shortDefinition, longDefinition });
  }
  return { schemaVersion: 1, terms };
}

export function loadGlossaryManifest(): GlossaryManifest {
  const path = resolve(process.cwd(), "content", "curriculum", "glossary.json");
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = parseGlossaryManifest(parsed);
  if ("kind" in result) {
    throw new Error(`Glossary manifest is invalid: ${result.message}`);
  }
  return result;
}

/**
 * Looks up a single term by slug. Returns null if the slug is unknown
 * so the renderer can fall back to the inline parenthesised
 * definition the author wrote.
 */
export function lookupGlossaryTerm(manifest: GlossaryManifest, slug: string): GlossaryTerm | null {
  return manifest.terms.find((term) => term.slug === slug) ?? null;
}
