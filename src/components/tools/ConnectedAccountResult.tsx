/**
 * ConnectedAccountResult — renders the simulator's graded output.
 *
 * STORY-089. Mirrors BidElevatorResult's structure: a "Result" heading,
 * a /100 score, per-dimension scores, a feedback note. The score is
 * explicitly formative (never certification, hiring, or job-readiness
 * signal — see STORY-078) and is rendered alongside a FormativeScoreNotice
 * so the label is unambiguous.
 */

import { FormativeScoreNotice } from "./FormativeScoreNotice";
import styles from "./ConnectedAccountResult.module.css";
import type { ConnectedAccountOutput } from "@/domain/simulator/connected-account";

interface Props {
  result: ConnectedAccountOutput;
}

export function ConnectedAccountResult({ result }: Props) {
  const dims = result.scoreDimensions;

  return (
    <section className={styles.result} aria-label="Scenario result">
      <header className={styles.header}>
        <h2 className={styles.title}>Result</h2>
        <div className={styles.score} aria-label={`Score ${result.score} out of 100`}>
          <span className={styles.scoreNum}>{result.score}</span>
          <span className={styles.scoreDenom}>/100</span>
        </div>
      </header>

      <FormativeScoreNotice />

      {dims ? (
        <div className={styles.dimGrid}>
          <div className={styles.dimCard}>
            <span className={styles.dimLabel}>Bid accuracy</span>
            <span className={styles.dimValue}>{dims.bidAccuracy}%</span>
            <span className={styles.dimHint}>
              Share of keywords where your new bid lands within the optimal band at the target ACoS.
            </span>
          </div>
          <div className={styles.dimCard}>
            <span className={styles.dimLabel}>STR triage accuracy</span>
            <span className={styles.dimValue}>{dims.triageAccuracy}%</span>
            <span className={styles.dimHint}>
              Share of search terms where your triage action matches the ground-truth winner/bleeder
              classification.
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.detailSection}>
        <h3 className={styles.detailTitle}>Per-keyword outcome</h3>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th scope="col">Keyword</th>
              <th scope="col">Winner?</th>
              <th scope="col">Bleeder?</th>
              <th scope="col" className={styles.thNum}>
                Optimal bid
              </th>
              <th scope="col" className={styles.thNum}>
                Your bid
              </th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.keywords.map((k) => (
              <tr key={k.keywordId}>
                <td className={styles.tdKw}>{k.keyword}</td>
                <td>{k.isWinner ? "yes" : "—"}</td>
                <td>{k.isBleeder ? "yes" : "—"}</td>
                <td className={styles.tdNum}>₱{(k.optimalBidMinor / 100).toFixed(2)}</td>
                <td className={styles.tdNum}>
                  {k.userNewBidMinor !== undefined
                    ? `₱${(k.userNewBidMinor / 100).toFixed(2)}`
                    : "—"}
                </td>
                <td>
                  {k.isBidOptimal === undefined ? "—" : k.isBidOptimal ? "optimal" : "off-target"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.detailSection}>
        <h3 className={styles.detailTitle}>Per-search-term triage</h3>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th scope="col">Search term</th>
              <th scope="col">Ground truth</th>
              <th scope="col">Your action</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.searchTerms.map((t) => (
              <tr key={t.termId}>
                <td className={styles.tdKw}>{t.term}</td>
                <td>{t.groundTruthAction.replace("_", " ")}</td>
                <td>{t.userAction ? t.userAction.replace("_", " ") : "—"}</td>
                <td>
                  {t.isTriageCorrect === undefined ? "—" : t.isTriageCorrect ? "correct" : "wrong"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
