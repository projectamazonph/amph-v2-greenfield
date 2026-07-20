/**
 * /tools/bid-elevator — student-facing simulator page.
 *
 * Loads a hardcoded scenario from the Stitch spec
 * (docs/ui-specs/STITCH-PROMPTS.md §20, "Reduce ACoS on a high-spend
 * electronics campaign"), renders the editable bid form, and shows
 * the simulator's result after the user submits.
 *
 * The result is stored in sessionStorage by the client form and
 * re-read here on re-render. (A cleaner pattern is a real route
 * segment; sessionStorage keeps this file to one route.)
 */

import { buildContainer } from "@/composition/container";
import { BidElevatorForm } from "@/components/tools/BidElevatorForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface SeedKeyword {
  keyword: string;
  currentBid: number;
  currentCpc: number;
  volume: number;
}

const SCENARIO = {
  title: "Reduce ACoS on a high-spend electronics campaign",
  brief:
    "Your wireless earbuds campaign is spending ₱800/day but ACoS is 45%. Target ACoS is 25%. Adjust bids to bring spend in line.",
  budget: 1000,
  targetRoas: 4.0, // implied from 25% ACoS → 4× ROAS
  keywords: [
    { keyword: "wireless earbuds", currentBid: 25, currentCpc: 0.85, volume: 12450 },
    { keyword: "bluetooth earbuds", currentBid: 30, currentCpc: 1.10, volume: 8200 },
    { keyword: "wireless headphones", currentBid: 15, currentCpc: 0.60, volume: 22100 },
    { keyword: "earbuds for iphone", currentBid: 20, currentCpc: 0.75, volume: 5600 },
    { keyword: "cheap earbuds", currentBid: 18, currentCpc: 0.50, volume: 15300 },
    { keyword: "running earbuds", currentBid: 22, currentCpc: 0.95, volume: 4100 },
    { keyword: "noise cancelling earbuds", currentBid: 28, currentCpc: 1.20, volume: 6800 },
    { keyword: "earbuds with mic", currentBid: 16, currentCpc: 0.65, volume: 9400 },
  ] as const satisfies ReadonlyArray<SeedKeyword>,
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
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/tools">← Tools</a>
        <span aria-hidden="true"> / </span>
        <span>Bid Elevator</span>
      </nav>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulator</span>
        <h1 className={styles.title}>{SCENARIO.title}</h1>
        <p className={styles.brief}>{SCENARIO.brief}</p>
      </header>
      <BidElevatorForm
        budget={SCENARIO.budget}
        targetRoas={SCENARIO.targetRoas}
        initialKeywords={SCENARIO.keywords}
      />
      <p className={styles.note}>
        Adjust the bids and run the simulation. The result appears below.
      </p>
    </main>
  );
}
