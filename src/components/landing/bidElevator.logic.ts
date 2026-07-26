/**
 * Pure math for the landing page's Bid Elevator preview widget.
 * Illustrative model only — not the real bid-elevator simulator
 * (src/domain/simulator/bid-elevator/), which is scored, port-based, and
 * runs against a signed-in student's account. This one is a public,
 * unauthenticated marketing demo, so it stays self-contained here rather
 * than reusing the domain simulator's Result/port plumbing.
 */

export const AOV = 32;
export const REF_BID = 0.85;

export type TermState = "auto" | "exact" | "neg";

export interface SearchTermRow {
  id: string;
  term: string;
  imp: number;
  clk: number;
  cpc: number;
  cvr: number;
}

export const SEARCH_TERM_ROWS: readonly SearchTermRow[] = [
  { id: "r1", term: "running shoes men", imp: 4200, clk: 38, cpc: 0.86, cvr: 0.12 },
  { id: "r2", term: "best ppc tool", imp: 3100, clk: 22, cpc: 1.1, cvr: 0.02 },
  { id: "r3", term: "amazon ads course", imp: 2600, clk: 19, cpc: 0.95, cvr: 0.03 },
  { id: "r4", term: "sponsored products bid", imp: 5100, clk: 51, cpc: 0.72, cvr: 0.14 },
  { id: "r5", term: "free ppc audit", imp: 1900, clk: 16, cpc: 1.25, cvr: 0.01 },
  { id: "r6", term: "campaign structure", imp: 3600, clk: 33, cpc: 0.8, cvr: 0.11 },
];

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Rounds up to a "nice" axis ceiling (1/2/5/10 × a power of ten). */
export function niceStep(v: number): number {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return s * p;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** A search term's own baseline ACoS, independent of the budget/bid sliders. */
export function ownAcos(row: SearchTermRow): number {
  return (row.cpc / (row.cvr * AOV)) * 100;
}

export interface RowView {
  id: string;
  term: string;
  spend: number;
  sales: number;
  acos: number | null;
  breakEven: number;
}

export interface AggregateMetrics {
  imp: number;
  clk: number;
  spend: number;
  ord: number;
  sales: number;
  acos: number | null;
  ctr: number;
  cvr: number;
  view: RowView[];
}

/**
 * Models what a budget/bid/target-ACoS change would do to the sample
 * account: bid moves reach (impressions) and click volume; when the
 * resulting raw spend would exceed the budget, every included term's
 * volume is scaled down proportionally (an auction-pacing approximation,
 * not a real second-price auction).
 */
export function computeBidElevator(
  rows: readonly SearchTermRow[],
  states: Readonly<Record<string, TermState>>,
  budget: number,
  bid: number,
  targetAcosPct: number,
): AggregateMetrics {
  const bidMult = clamp(bid / REF_BID, 0.4, 2.2);
  const effCpcFactor = clamp(bidMult, 0.7, 1.4);

  const included = rows.filter((r) => states[r.id] !== "neg");
  let rawSpend = 0;
  const raw = included.map((r) => {
    const rc = r.clk * bidMult;
    const ec = r.cpc * effCpcFactor;
    rawSpend += rc * ec;
    return { r, rc, ec };
  });
  const vol = rawSpend > budget ? budget / rawSpend : 1;

  let tImp = 0;
  let tClk = 0;
  let tSpend = 0;
  let tOrd = 0;
  let tSales = 0;

  const view: RowView[] = raw.map(({ r, rc, ec }) => {
    const clk = rc * vol;
    const spend = clk * ec;
    const imp = r.imp * bidMult * vol;
    const cvrEff = r.cvr * (states[r.id] === "exact" ? 1.25 : 1);
    const ord = clk * cvrEff;
    const sales = ord * AOV;
    tImp += imp;
    tClk += clk;
    tSpend += spend;
    tOrd += ord;
    tSales += sales;
    const acos = sales > 0 ? (spend / sales) * 100 : null;
    const breakEven = targetAcosPct > 0 ? spend / (targetAcosPct / 100) : 0;
    return { id: r.id, term: r.term, spend, sales, acos, breakEven };
  });

  return {
    imp: tImp,
    clk: tClk,
    spend: tSpend,
    ord: tOrd,
    sales: tSales,
    acos: tSales > 0 ? (tSpend / tSales) * 100 : null,
    ctr: tImp > 0 ? (tClk / tImp) * 100 : 0,
    cvr: tClk > 0 ? (tOrd / tClk) * 100 : 0,
    view,
  };
}
