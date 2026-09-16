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
import { SimulatorNextRep } from "./SimulatorNextRep";
import { ToolDebrief } from "./ToolDebrief";
import { saveArtefactAction } from "@/app/actions/artefact.action";

interface Props {
  result: BidElevatorOutput;
  targetRoas: number;
  xpAwarded?: number | null;
  scenarioName?: string | null;
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

export function BidElevatorResult({ result, targetRoas, xpAwarded, scenarioName }: Props) {
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
          {/* M-R30 fix: scope="col" on every header so screen readers
              associate cells with their column header (WCAG 1.3.1).
              The parent role="region" aria-label="Bid recommendations"
              supplies the accessible name. */}
          <thead>
            <tr>
              <th scope="col">Keyword</th>
              <th scope="col">Confidence</th>
              <th scope="col" className={styles.thNum}>
                Current
              </th>
              <th scope="col" className={styles.thNum}>
                Suggested
              </th>
              <th scope="col" className={styles.thNum}>
                Δ
              </th>
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
      <SimulatorNextRep simulatorId="bid-elevator" />
      <ToolDebrief
        simulatorId="bid-elevator"
        scoreLabel={
          result.score >= 80
            ? "Strong. Every bid change stays inside the target ACoS."
            : result.score >= 50
              ? "Mixed. At least one keyword needs a different call."
              : "Keep practising. Re-read the evidence window before changing a bid."
        }
        whyItMatters="A client keeps the VA who can explain the reason for a bid change in plain language, not the one who guesses the fastest. This score measures whether the bids match the evidence."
        lessonHref="/courses/ppc-foundations"
        lessonLabel="Revisit the Module 6 bidding lessons (PPC Foundations)"
        retryHref="/tools/bid-elevator"
        rationalePrompt={rationalePromptFor(result.score)}
        saveAction={{ save: saveArtefactAction }}
        artefactKind="decision-log"
        scenarioRef={scenarioName ?? null}
        courseId={null}
      />
    </section>
  );
}

function rationalePromptFor(score: number): string {
  if (score >= 80) {
    return "Write one sentence per keyword explaining why the bid is right, as you would to the client.";
  }
  return "Pick the keyword you are least sure about and write what evidence would change your call.";
}
