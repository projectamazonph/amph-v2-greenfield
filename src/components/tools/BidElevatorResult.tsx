/**
 * BidElevatorResult — server component.
 *
 * Renders the simulator's output: a 0-100 score, projected daily
 * spend, projected ROAS, and the per-keyword recommendations.
 */

import styles from "./BidElevatorResult.module.css";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";

interface Props {
  result: BidElevatorOutput;
  targetRoas: number;
}

function scoreColor(score: number): "var(--success)" | "var(--warning)" | "var(--danger)" {
  if (score >= 80) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

export function BidElevatorResult({ result, targetRoas }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="bid-result-heading">
      <header className={styles.header}>
        <h2 id="bid-result-heading" className={styles.heading}>
          Result
        </h2>
        <div
          className={styles.score}
          style={{ color: scoreColor(result.score) }}
        >
          {result.score}
          <span className={styles.scoreSuffix}>/100</span>
        </div>
      </header>
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Projected daily spend</span>
          <span className={styles.metaValue}>
            ₱{result.estimatedSpend.toFixed(2)}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Projected ROAS</span>
          <span
            className={styles.metaValue}
            style={{
              color: result.estimatedRoas >= targetRoas
                ? "var(--success)"
                : "var(--danger)",
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
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Keyword</th>
            <th className={styles.thNum}>Volume</th>
            <th className={styles.thNum}>Current</th>
            <th className={styles.thNum}>Suggested</th>
            <th className={styles.thNum}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {result.bids.map((b) => {
            const delta = b.suggestedBid - b.currentBid;
            return (
              <tr key={b.keyword}>
                <td className={styles.tdKw}>{b.keyword}</td>
                <td className={styles.tdNum}>{b.volume.toLocaleString()}</td>
                <td className={styles.tdNum}>₱{b.currentBid.toFixed(2)}</td>
                <td className={styles.tdNumStrong}>₱{b.suggestedBid.toFixed(2)}</td>
                <td
                  className={styles.tdNum}
                  style={{
                    color: delta > 0
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
    </section>
  );
}
