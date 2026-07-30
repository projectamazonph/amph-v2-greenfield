/**
 * /tools/bid-elevator — student-facing simulator page.
 *
 * STORY-079: Bid Elevator economic model rewrite. The scenario is now
 * authored with per-keyword economics (baseline CTR/CVR, benchmark CPC,
 * available impression volume, bid elasticity, evidence counts) rather
 * than a bare keyword/volume/CPC row, so ground truth is reproducible
 * from authored data instead of a hardcoded 2% CTR constant.
 *
 * Per the STORY-079 scoping decision, the practice tool is
 * scenario-only: the student adjusts each keyword's bid, but does not
 * type in keyword economics themselves (those fields can't be filled in
 * meaningfully by a free-typing user under the new model).
 *
 * The result is stored in sessionStorage by the client form and
 * re-read here on re-render. (A cleaner pattern is a real route
 * segment; sessionStorage keeps this file to one route.)
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { BidElevatorForm } from "@/components/tools/BidElevatorForm";
import type { BidElevatorKeywordScenario } from "@/domain/simulator/bid-elevator/BidElevatorInput";
import { StudentShell } from '@/components/student/StudentShell';
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Reduce ACoS on a high-spend electronics campaign",
  brief:
    "Your wireless earbuds campaign is spending ₱800/day but ACoS is 45%. Target ACoS is 25%. Adjust bids to bring spend in line.",
  currencyCode: "USD",
  dailyBudget: 1000,
  simulationDays: 1,
  targetRoas: 4.0, // implied from 25% ACoS -> 4x ROAS
  breakEvenAcosPct: 45,
  defaultRevenuePerOrder: 35,
  minimumBidIncrement: 0.05,
  keywords: [
    {
      keywordId: "wireless-earbuds",
      keyword: "wireless earbuds",
      matchType: "exact",
      intent: "generic",
      strategicRole: "performance",
      currentBid: 25,
      baselineBid: 25,
      baselineCtrPct: 2.6,
      baselineCvrPct: 11,
      benchmarkCpc: 0.85,
      availableImpressionsPerDay: 415,
      maxImpressionSharePct: 40,
      bidElasticity: 1.5,
      evidenceClicks: 62,
      evidenceOrders: 7,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "bluetooth-earbuds",
      keyword: "bluetooth earbuds",
      matchType: "exact",
      intent: "generic",
      strategicRole: "performance",
      currentBid: 30,
      baselineBid: 30,
      baselineCtrPct: 2.2,
      baselineCvrPct: 9,
      benchmarkCpc: 1.1,
      availableImpressionsPerDay: 273,
      maxImpressionSharePct: 38,
      bidElasticity: 1.4,
      evidenceClicks: 48,
      evidenceOrders: 4,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "wireless-headphones",
      keyword: "wireless headphones",
      matchType: "broad",
      intent: "category",
      strategicRole: "research",
      currentBid: 15,
      baselineBid: 15,
      baselineCtrPct: 1.6,
      baselineCvrPct: 6,
      benchmarkCpc: 0.6,
      availableImpressionsPerDay: 737,
      maxImpressionSharePct: 30,
      bidElasticity: 1.2,
      evidenceClicks: 35,
      evidenceOrders: 2,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "earbuds-for-iphone",
      keyword: "earbuds for iphone",
      matchType: "phrase",
      intent: "category",
      strategicRole: "research",
      currentBid: 20,
      baselineBid: 20,
      baselineCtrPct: 2.4,
      baselineCvrPct: 10,
      benchmarkCpc: 0.75,
      availableImpressionsPerDay: 187,
      maxImpressionSharePct: 40,
      bidElasticity: 1.6,
      evidenceClicks: 33,
      evidenceOrders: 4,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "cheap-earbuds",
      keyword: "cheap earbuds",
      matchType: "broad",
      intent: "category",
      strategicRole: "research",
      currentBid: 18,
      baselineBid: 18,
      baselineCtrPct: 1.8,
      baselineCvrPct: 5,
      benchmarkCpc: 0.5,
      availableImpressionsPerDay: 510,
      maxImpressionSharePct: 32,
      bidElasticity: 1.1,
      evidenceClicks: 41,
      evidenceOrders: 2,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "running-earbuds",
      keyword: "running earbuds",
      matchType: "phrase",
      intent: "category",
      strategicRole: "research",
      currentBid: 22,
      baselineBid: 22,
      baselineCtrPct: 2.9,
      baselineCvrPct: 12,
      benchmarkCpc: 0.95,
      availableImpressionsPerDay: 137,
      maxImpressionSharePct: 42,
      bidElasticity: 1.7,
      evidenceClicks: 29,
      evidenceOrders: 3,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "noise-cancelling-earbuds",
      keyword: "noise cancelling earbuds",
      matchType: "exact",
      intent: "generic",
      strategicRole: "performance",
      currentBid: 28,
      baselineBid: 28,
      baselineCtrPct: 2.7,
      baselineCvrPct: 13,
      benchmarkCpc: 1.2,
      availableImpressionsPerDay: 227,
      maxImpressionSharePct: 40,
      bidElasticity: 1.5,
      evidenceClicks: 55,
      evidenceOrders: 8,
      evidenceWindowDays: 30,
    },
    {
      keywordId: "earbuds-with-mic",
      keyword: "earbuds with mic",
      matchType: "phrase",
      intent: "category",
      strategicRole: "research",
      currentBid: 16,
      baselineBid: 16,
      baselineCtrPct: 2.0,
      baselineCvrPct: 8,
      benchmarkCpc: 0.65,
      availableImpressionsPerDay: 313,
      maxImpressionSharePct: 35,
      bidElasticity: 1.3,
      evidenceClicks: 26,
      evidenceOrders: 2,
      evidenceWindowDays: 30,
    },
  ] as const satisfies ReadonlyArray<BidElevatorKeywordScenario>,
};

export default async function BidElevatorPage() {
  // Make sure the simulator is actually registered in this container
  // (smoke test for the DI wiring; would catch a missing import).
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    throw new Error("Bid Elevator simulator not registered");
  }

  return (
    <StudentShell>
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools">← Tools</Link>
          <span aria-hidden="true"> / </span>
          <span>Bid Elevator</span>
          <Link href="/tools/bid-elevator" className="btn btn-ghost" style={{ marginLeft: 'var(--space-3)' }}>Reset</Link>
          <button className="btn btn-ghost" style={{ marginLeft: 'var(--space-3)' }}>Save scenario</button>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{SCENARIO.title}</h1>
          <p className={styles.brief}>{SCENARIO.brief}</p>
        </header>
        <BidElevatorForm scenario={SCENARIO} />
        <p className={styles.note}>
          Adjust the bids and run the simulation. The result appears below.
        </p>
      </main>
    </StudentShell>
  );
}
