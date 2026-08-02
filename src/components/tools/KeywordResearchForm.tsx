/**
 * KeywordResearchForm — client component.
 *
 * STORY-081: Keyword Research is now its own simulator with its own
 * workflow: generate a niche's keyword rows (market metrics only, no
 * ground-truth labels), classify each keyword's search intent and flag
 * which ones should become negative keywords, then submit for grading
 * against the dataset's own labels.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./KeywordResearchForm.module.css";
import { FormativeScoreNotice } from "./FormativeScoreNotice";
import {
  previewKeywordResearch,
  keywordResearchAttempt,
  type KeywordPreview,
  type KeywordResearchAttemptResult,
} from "@/app/tools/keyword-research/actions";
import type { KeywordIntent } from "@/domain/entities/KeywordDataset";

interface Props {
  initialNiche: string;
}

interface Classification {
  /** Undefined until the student explicitly picks one -- never defaulted. */
  intent?: KeywordIntent;
  isNegative: boolean;
}

const INTENT_OPTIONS: readonly { value: KeywordIntent; label: string }[] = [
  { value: "core", label: "Core" },
  { value: "feature", label: "Feature" },
  { value: "problem", label: "Problem" },
  { value: "useCase", label: "Use case" },
  { value: "competitor", label: "Competitor" },
  { value: "ownBrand", label: "Own brand" },
  { value: "irrelevant", label: "Irrelevant" },
];

export function KeywordResearchForm({ initialNiche }: Props) {
  const [niche, setNiche] = useState(initialNiche);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<KeywordPreview | null>(null);
  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [attempt, setAttempt] = useState<KeywordResearchAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAttempt(null);
    startTransition(async () => {
      const r = await previewKeywordResearch({ niche });
      if (r.ok) {
        setPreview(r.value);
        setClassifications({});
      } else {
        setPreview(null);
        setError(r.error.message);
      }
    });
  };

  const setClassification = (normalizedTerm: string, patch: Partial<Classification>) => {
    setClassifications((prev) => ({
      ...prev,
      [normalizedTerm]: {
        intent: prev[normalizedTerm]?.intent,
        isNegative: prev[normalizedTerm]?.isNegative ?? false,
        ...patch,
      },
    }));
  };

  const onSubmitForGrading = () => {
    if (!preview) return;
    setError(null);
    // Every row must have an explicit intent before this fires (the submit
    // button stays disabled until classifiedCount === keywords.length), but
    // narrow here too so a partially-classified row can never be silently
    // graded with an intent the student didn't choose.
    const fullyClassified: Record<string, { intent: KeywordIntent; isNegative: boolean }> = {};
    for (const [normalizedTerm, c] of Object.entries(classifications)) {
      if (c.intent !== undefined) {
        fullyClassified[normalizedTerm] = { intent: c.intent, isNegative: c.isNegative };
      }
    }
    startTransition(async () => {
      const r = await keywordResearchAttempt({
        niche,
        classifications: fullyClassified,
        mode: "practice",
      });
      if (r.ok) {
        setAttempt(r.value);
      } else {
        setError("message" in r.error ? r.error.message : "Could not grade this attempt.");
      }
    });
  };

  const classifiedCount = preview
    ? preview.keywords.filter((k) => classifications[k.normalizedTerm]?.intent !== undefined).length
    : 0;

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={onGenerate}>
        <div className={styles.inputRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="kr-niche">
              Product niche
            </label>
            <input
              id="kr-niche"
              className={styles.input}
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. bamboo cutting board"
              maxLength={120}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? "Loading…" : "Generate keywords"}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>

      {preview && !attempt ? (
        <div className={styles.results}>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Keywords</span>
              <span className={styles.summaryValue}>{preview.keywords.length}</span>
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Classified</span>
              <span className={styles.summaryValue}>
                {classifiedCount}/{preview.keywords.length}
              </span>
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Dataset</span>
              <span className={styles.summaryValue}>
                {preview.sourceType === "curated_export" ? "Curated" : "Synthetic (practice)"}
              </span>
            </span>
          </div>

          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Keyword classification"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th className={styles.thNum}>Volume/mo</th>
                  <th className={styles.thNum}>Competition</th>
                  <th className={styles.thNum}>Median bid</th>
                  <th>Intent</th>
                  <th>Negative</th>
                </tr>
              </thead>
              <tbody>
                {preview.keywords.map((k) => {
                  const c = classifications[k.normalizedTerm];
                  return (
                    <tr key={k.normalizedTerm}>
                      <td className={styles.tdKw}>{k.term}</td>
                      <td className={styles.tdNum}>{k.monthlySearchVolume.toLocaleString()}</td>
                      <td className={styles.tdNum}>{Math.round(k.competitionIndex * 100)}%</td>
                      <td className={styles.tdNum}>${k.suggestedBidMedian.toFixed(2)}</td>
                      <td>
                        <select
                          className={styles.select}
                          value={c?.intent ?? ""}
                          onChange={(e) =>
                            setClassification(k.normalizedTerm, {
                              intent: e.target.value as KeywordIntent,
                            })
                          }
                        >
                          <option value="" disabled>
                            Choose…
                          </option>
                          {INTENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={c?.isNegative ?? false}
                          onChange={(e) =>
                            setClassification(k.normalizedTerm, { isNegative: e.target.checked })
                          }
                          aria-label={`Flag "${k.term}" as negative`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className={styles.submit}
            disabled={pending || classifiedCount < preview.keywords.length}
            onClick={onSubmitForGrading}
          >
            {pending ? "Grading…" : "Submit for grading"}
          </button>
        </div>
      ) : null}

      {attempt ? (
        <div className={styles.results}>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Score</span>
              <span className={styles.summaryValue}>{attempt.overallScore}</span>
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Result</span>
              <span className={styles.summaryValue}>{attempt.isPassed ? "Passed" : "Not yet"}</span>
            </span>
          </div>
          <FormativeScoreNotice />
          <p>{attempt.feedback.overallComment}</p>
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Keyword grading results"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Your intent</th>
                  <th>Correct intent</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {attempt.keywords.map((k) => (
                  <tr key={k.normalizedTerm}>
                    <td className={styles.tdKw}>{k.term}</td>
                    <td>{k.userIntent ?? "—"}</td>
                    <td>{k.groundTruthIntent}</td>
                    <td>
                      <span
                        className={styles.resultBadge}
                        data-correct={k.isIntentCorrect ? "true" : "false"}
                      >
                        {k.isIntentCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
