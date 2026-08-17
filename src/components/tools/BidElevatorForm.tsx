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
 *
 * STORY-085: submits to bidElevatorAttempt() (the graded, persisted-attempt
 * lifecycle) instead of the legacy runBidElevator(), which never created a
 * SimulatorAttempt record. Only the student's bid adjustments are sent —
 * the scenario's economics are resolved server-side from the currently
 * published scenario, not echoed back from this component's props.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./BidElevatorForm.module.css";
import { bidElevatorAttempt } from "@/app/tools/bid-elevator/actions";
import type { BidElevatorScenarioContent } from "@/app/tools/bid-elevator/scenarioContent";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import { BidElevatorResult } from "./BidElevatorResult";
import { SimulatorModeToggle } from "./SimulatorModeToggle";
import type { PracticeOrChallengeMode } from "./SimulatorModeToggle";
import { studentErrorCopy } from "@/lib/studentErrorCopy";

interface Props {
  scenario: BidElevatorScenarioContent;
  challengeUnlocked: boolean;
}

export function BidElevatorForm({ scenario, challengeUnlocked }: Props) {
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(scenario.keywords.map((k) => [k.keywordId, k.currentBid])),
  );
  const [mode, setMode] = useState<PracticeOrChallengeMode>("practice");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<BidElevatorOutput | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const onChange = (keywordId: string, value: number) => {
    setBids((prev) => ({ ...prev, [keywordId]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await bidElevatorAttempt({ userBidAdjustments: bids, mode });
        if (!response.ok) {
          setError(
            "message" in response.error ? response.error.message : studentErrorCopy.simulatorRun,
          );
          return;
        }
        setSimResult({
          score: response.value.overallScore,
          scoreDimensions: response.value.scoreDimensions,
          bids: response.value.bids,
          estimatedSpend: response.value.estimatedSpend,
          estimatedRoas: response.value.estimatedRoas,
        });
        setXpAwarded(response.value.xpAwarded ?? null);
      } catch {
        setError(studentErrorCopy.simulatorRun);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <SimulatorModeToggle mode={mode} onChange={setMode} unlocked={challengeUnlocked} />
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
          {/* M-R30 fix: scope="col" on every header so screen readers
              associate cells with their column header (WCAG 1.3.1).
              The parent role="region" aria-label="Bid inputs" supplies
              the accessible name. */}
          <thead>
            <tr>
              <th scope="col">Keyword</th>
              <th scope="col" className={styles.thNum}>Impr/day</th>
              <th scope="col" className={styles.thNum}>Benchmark CPC</th>
              <th scope="col" className={styles.thNum}>Your bid</th>
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
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className={styles.submit}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Running…" : "Run simulation"}
      </button>
      {simResult ? (
        <BidElevatorResult
          result={simResult}
          targetRoas={scenario.targetRoas}
          xpAwarded={xpAwarded}
        />
      ) : null}
    </form>
  );
}
