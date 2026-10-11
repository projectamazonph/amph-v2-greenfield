/**
 * worksheetConsistency.ts — pure consistency checks for STORY-164.
 *
 * The Lesson 1.5 read view consumes the rows a learner wrote in
 * Lessons 1.1-1.5 and checks that they actually agree. Three
 * checks cover the relationships the lessons themselves teach:
 *
 *   1. maxCpc (1.2) ≈ maxCpcRecap (1.5)
 *   2. breakEvenAcos (1.3) ≈ profitMarginBeforeAds (1.3)
 *   3. minimumRoas (1.4) ≈ 1 / profitMarginBeforeAds (1.3)
 *
 * Each check returns a status:
 *   - "ok"     — values match within 1% (rounding tolerance)
 *   - "drift"  — values disagree; renderer shows the gap
 *   - "unknown" — one side is empty or unparseable
 *
 * Pure function: no IO, no DB, no time. Safe to call from a
 * server component, a client component, or a test.
 */

const TOLERANCE = 0.01; // 1% absolute relative tolerance

export type ConsistencyStatus = "ok" | "drift" | "unknown";

export interface ConsistencyCheck {
  readonly status: ConsistencyStatus;
  /** The absolute difference between the two values, when both parse. Undefined when status is "unknown". */
  readonly drift?: number;
  /** Human-readable short reason, used by the renderer to explain the drift. */
  readonly reason?: string;
}

export interface Module1RowSnapshot {
  // 1.1 Big Six (not used in checks but the snapshot carries them for the renderer)
  readonly weeklyImpressions: string;
  readonly weeklyClicks: string;
  readonly weeklyAdSpend: string;
  readonly weeklyAdSales: string;
  readonly weeklyTotalSales: string;
  // 1.2 CPC-CTR
  readonly productCvr: string;
  readonly targetAcos: string;
  readonly maxCpc: string;
  // 1.3 profitability
  readonly weeklyActualAcos: string;
  readonly profitMarginBeforeAds: string;
  readonly weeklyTacos: string;
  readonly breakEvenAcos: string;
  // 1.4 ROAS
  readonly productProfitMargin: string;
  readonly minimumRoas: string;
  // 1.5 max-CPC recap
  readonly maxCpcRecap: string;
}

export interface WorksheetConsistencyResult {
  readonly maxCpcRecap: ConsistencyCheck;
  readonly breakEvenAcos: ConsistencyCheck;
  readonly minimumRoas: ConsistencyCheck;
}

/**
 * Parse a user-typed number. Strips currency symbols (₱, $),
 * commas, and surrounding whitespace. Returns null when the
 * value is empty or unparseable.
 */
export function parseWorksheetNumber(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // Drop currency symbols, percent signs, commas, and whitespace.
  const cleaned = trimmed.replace(/[\s₱$£€%,]/g, "");
  if (cleaned.length === 0) return null;
  // Allow a trailing percent to mean "divide by 100".
  const asPercent = trimmed.endsWith("%");
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return asPercent ? numeric / 100 : numeric;
}

/**
 * Compare two parsed numbers with the 1% tolerance. Returns
 * "ok" when both are parseable and within tolerance, "drift"
 * when both parse but disagree, and "unknown" otherwise.
 */
function compare(a: number | null, b: number | null): ConsistencyCheck {
  if (a === null || b === null) {
    return { status: "unknown" };
  }
  if (a === 0 && b === 0) {
    return { status: "ok" };
  }
  const maxAbs = Math.max(Math.abs(a), Math.abs(b));
  if (maxAbs === 0) {
    return { status: "ok" };
  }
  const relative = Math.abs(a - b) / maxAbs;
  if (relative <= TOLERANCE) {
    return { status: "ok" };
  }
  return { status: "drift", drift: relative, reason: `differs by ${(relative * 100).toFixed(1)}%` };
}

export function computeWorksheetConsistency(
  rows: Module1RowSnapshot,
): WorksheetConsistencyResult {
  // Check 1: maxCpc recap. Lesson 1.2 teaches the max-CPC formula
  // and Lesson 1.5 asks the learner to recap it. Both should be
  // the same number.
  const maxCpc = parseWorksheetNumber(rows.maxCpc);
  const maxCpcRecap = parseWorksheetNumber(rows.maxCpcRecap);
  const maxCpcCheck: ConsistencyCheck = (() => {
    if (maxCpc === null || maxCpcRecap === null) {
      return { status: "unknown" };
    }
    const cmp = compare(maxCpc, maxCpcRecap);
    if (cmp.status === "drift") {
      return { ...cmp, reason: `maxCpc (1.2) and maxCpcRecap (1.5) disagree: ${cmp.reason}` };
    }
    return cmp;
  })();

  // Check 2: breakEvenAcos equals the profit margin. These are
  // taught as the same number in Lesson 1.3.
  const breakEvenAcos = parseWorksheetNumber(rows.breakEvenAcos);
  const profitMargin = parseWorksheetNumber(rows.profitMarginBeforeAds);
  const breakEvenCheck: ConsistencyCheck = (() => {
    if (breakEvenAcos === null || profitMargin === null) {
      return { status: "unknown" };
    }
    const cmp = compare(breakEvenAcos, profitMargin);
    if (cmp.status === "drift") {
      return {
        ...cmp,
        reason: `breakEvenAcos and profitMarginBeforeAds disagree: ${cmp.reason}`,
      };
    }
    return cmp;
  })();

  // Check 3: minimumRoas equals 1 / profitMargin. The reciprocal
  // relationship is taught in Lesson 1.4.
  const minimumRoas = parseWorksheetNumber(rows.minimumRoas);
  const minimumRoasCheck: ConsistencyCheck = (() => {
    if (minimumRoas === null || profitMargin === null || profitMargin === 0) {
      return { status: "unknown" };
    }
    const reciprocal = 1 / profitMargin;
    const cmp = compare(reciprocal, minimumRoas);
    if (cmp.status === "drift") {
      return {
        ...cmp,
        reason: `1 / profitMargin = ${reciprocal.toFixed(2)}, but you typed ${minimumRoas.toFixed(2)}`,
      };
    }
    return cmp;
  })();

  return {
    maxCpcRecap: maxCpcCheck,
    breakEvenAcos: breakEvenCheck,
    minimumRoas: minimumRoasCheck,
  };
}
