/**
 * BidElevatorForm — client component.
 *
 * STORY-079: Bid Elevator economic model rewrite. Renders the scenario's
 * authored keywords as a table of editable bids. The user tweaks the bid
 * per keyword, then submits; the server action runs the simulator and the
 * result renders inline via BidElevatorResult.
 *
 * Per the STORY-079 scoping decision the tool is scenario-only: keyword
 * economics (CTR, CVR, benchmark CPC, etc.) are authored server-side, not
 * typed in by the student — only the bid is editable.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./BidElevatorForm.module.css";
import { runBidElevator, type RunBidElevatorInput } from "@/app/tools/bid-elevator/actions";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import { BidElevatorResult } from "./BidElevatorResult";

interface Props {
  scenario: Omit<RunBidElevatorInput, "userBidAdjustments">;
}

export function BidElevatorForm({ scenario }: Props) {
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(scenario.keywords.map((k) => [k.keywordId, k.currentBid])),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<BidElevatorOutput | null>(null);

  const onChange = (keywordId: string, value: number) => {
    setBids((prev) => ({ ...prev, [keywordId]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: RunBidElevatorInput = {
      ...scenario,
      userBidAdjustments: bids,
    };
    startTransition(async () => {
      const response = await runBidElevator(input);
      if (!response.ok) {
        setError(response.error.message);
        return;
      }
      setSimResult(response.value);
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Daily budget</span>
          <span className={styles.metaValue}>₱{scenario.dailyBudget.toLocaleString()}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Target ROAS</span>
          <span className={styles.metaValue}>{scenario.targetRoas.toFixed(1)}×</span>
        </span>
      </div>
      <div className={styles.tableScroll} role="region" aria-label="Bid inputs" tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Keyword</th>
              <th className={styles.thNum}>Impr/day</th>
              <th className={styles.thNum}>Benchmark CPC</th>
              <th className={styles.thNum}>Your bid</th>
            </tr>
          </thead>
          <tbody>
            {scenario.keywords.map((k) => (
              <tr key={k.keywordId}>
                <td className={styles.tdKw}>{k.keyword}</td>
                <td className={styles.tdNum}>{k.availableImpressionsPerDay.toLocaleString()}</td>
                <td className={styles.tdNum}>₱{k.benchmarkCpc.toFixed(2)}</td>
                <td className={styles.tdNum}>
                  <span className={styles.inputWrap}>
                    <span className={styles.inputPrefix}>₱</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      className={styles.input}
                      value={bids[k.keywordId] ?? k.currentBid}
                      onChange={(e) => onChange(k.keywordId, Number(e.target.value))}
                      aria-label={`Bid for ${k.keyword}`}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Running…" : "Run simulation"}
      </button>
      {simResult ? <BidElevatorResult result={simResult} targetRoas={scenario.targetRoas} /> : null}
    </form>
  );
}
