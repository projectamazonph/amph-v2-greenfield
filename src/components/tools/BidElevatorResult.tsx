/**
 * BidElevatorResult — server component.
 *
 * STORY-079: Bid Elevator economic model rewrite. Renders the
 * simulator's output: a 0-100 score, projected daily spend, projected
 * ROAS, and the per-keyword recommendations with their evidence-based
 * confidence tier.
 */

import styles from "./BidElevatorResult.module.css";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import { FormativeScoreNotice } from "./FormativeScoreNotice";

interface Props {
  result: BidElevatorOutput;
  targetRoas: number;
  xpAwarded?: number | null;
}

function scoreColor(score: number): "var(--success)" | "var(--warning)" | "var(--danger)" {
  if (score >= 80) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}

export function BidElevatorResult({ result, targetRoas, xpAwarded }: Props) {
  return (
    <section
      className={styles.panel}
      aria-labelledby="bid-result-heading"
      role="status"
      aria-live="polite"
    >
      <header className={styles.header}>
        <h2 id="bid-result-heading" className={styles.heading}>
          Result
        </h2>
        <div className={styles.score} style={{ color: scoreColor(result.score) }}>
          {result.score}
          <span className={styles.scoreSuffix}>/100</span>
        </div>
      </header>
      <FormativeScoreNotice />
      {xpAwarded ? (
        <p className={styles.xpBanner}>+{xpAwarded} XP earned for passing in Challenge mode.</p>
      ) : null}
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Projected daily spend</span>
          <span className={styles.metaValue}>₱{result.estimatedSpend.toFixed(2)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Projected ROAS</span>
          <span
            className={styles.metaValue}
            style={{
              color: result.estimatedRoas >= targetRoas ? "var(--success)" : "var(--danger)",
            }}
          >
            {result.estimatedRoas.toFixed(2)}×
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Target ROAS</span>
          <span className={styles.metaValue}>{targetRoas.toFixed(1)}×</span>
        </div>
      </div>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Bid recommendations"
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Confidence</th>
              <th className={styles.thNum}>Current</th>
              <th className={styles.thNum}>Suggested</th>
              <th className={styles.thNum}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {result.bids.map((b) => {
              const delta = b.groundTruth - b.currentBid;
              return (
                <tr key={b.keywordId}>
                  <td className={styles.tdKw}>{b.keyword}</td>
                  <td className={styles.tdKw}>{confidenceLabel(b.confidence)}</td>
                  <td className={styles.tdNum}>₱{b.currentBid.toFixed(2)}</td>
                  <td className={styles.tdNumStrong}>₱{b.groundTruth.toFixed(2)}</td>
                  <td
                    className={styles.tdNum}
                    style={{
                      color:
                        delta > 0
                          ? "var(--success)"
                          : delta < 0
                            ? "var(--danger)"
                            : "var(--ink-500)",
                    }}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
