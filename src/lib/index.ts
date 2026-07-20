/**
 * src/lib — public re-exports for the application's pure utility layer.
 *
 * Per the file-dependency chain in AGENTS.md:
 *   src/lib/ ← Pure utilities (Result, Money, format). No deps.
 *
 * These re-exports exist so consumers can import from `@/lib/Result`
 * and `@/lib/Money` without knowing the internal domain path structure.
 * The domain types (Result, Money) are the canonical definitions;
 * this layer only re-exports them.
 *
 * Do NOT add business logic here. Only re-exports and pure helpers
 * with zero imports from domain/, ports/, infra/, or app/.
 */

// ── Re-exports from domain/shared and domain/values ──────────────

export { Result } from "@/domain/shared/Result";

export { Money } from "@/domain/values/Money";
