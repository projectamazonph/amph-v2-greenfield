/**
 * Module1WorksheetReadView — STORY-164 Lesson 1.5 one-page read view.
 *
 * Server component. Renders a single-page summary of the rows the
 * learner saved in Lessons 1.1 through 1.5, with three consistency
 * checks surfaced inline:
 *
 *   1. maxCpc (1.2) ≈ maxCpcRecap (1.5)
 *   2. breakEvenAcos (1.3) ≈ profitMarginBeforeAds (1.3)
 *   3. minimumRoas (1.4) ≈ 1 / profitMarginBeforeAds (1.3)
 *
 * Read-only: no inputs, no save action. The read view's whole job
 * is to show the learner what they wrote, so they can spot
 * inconsistencies before they take the patterns to a real account.
 *
 * When the learner has not saved any data yet, the page renders
 * an empty-state message that points back to Lessons 1.1 through
 * 1.4 instead of pretending the summary has content.
 */

import Link from "next/link";
import type { ReactElement } from "react";
import {
  computeWorksheetConsistency,
  type ConsistencyCheck,
  type Module1RowSnapshot,
} from "@/domain/artifacts/worksheetConsistency";
import type {
  Module1LessonSnapshot,
  Module1WorksheetSummary,
} from "@/usecases/GetModule1WorksheetSummary";
import styles from "./Module1WorksheetReadView.module.css";

export interface Module1WorksheetReadViewProps {
  readonly summary: Module1WorksheetSummary;
}

const LESSON_TITLES: Record<string, string> = {
  "1.1-read-ppc-data-before-you-change-it": "1.1 Read PPC data before you change it",
  "1.2-cpc-ctr": "1.2 CPC and CTR",
  "1.3-acos-tacos-profitability": "1.3 ACoS, TACoS, profitability",
  "1.4-roas-measuring-return": "1.4 ROAS: measuring return",
  "1.5-metrics-in-practice": "1.5 Metrics in practice (the recap)",
};

interface FieldRow {
  readonly label: string;
  readonly value: string;
}

const SNAPSHOT_FIELDS: { readonly section: string; readonly rows: readonly FieldRow[] }[] = [
  {
    section: "From 1.1: the Big Six",
    rows: [
      { label: "Weekly impressions", value: "weeklyImpressions" },
      { label: "Weekly clicks", value: "weeklyClicks" },
      { label: "Weekly ad spend", value: "weeklyAdSpend" },
      { label: "Weekly ad sales", value: "weeklyAdSales" },
      { label: "Weekly total sales", value: "weeklyTotalSales" },
    ],
  },
  {
    section: "From 1.2: CPC and CTR",
    rows: [
      { label: "Product CVR", value: "productCvr" },
      { label: "Target ACoS", value: "targetAcos" },
      { label: "Max CPC", value: "maxCpc" },
    ],
  },
  {
    section: "From 1.3: profitability",
    rows: [
      { label: "Weekly actual ACoS", value: "weeklyActualAcos" },
      { label: "Profit margin before ads", value: "profitMarginBeforeAds" },
      { label: "Weekly TACoS", value: "weeklyTacos" },
      { label: "Break-even ACoS", value: "breakEvenAcos" },
    ],
  },
  {
    section: "From 1.4: ROAS",
    rows: [
      { label: "Product profit margin", value: "productProfitMargin" },
      { label: "Minimum ROAS", value: "minimumRoas" },
    ],
  },
  {
    section: "From 1.5: the recap",
    rows: [{ label: "Max CPC recap", value: "maxCpcRecap" }],
  },
];

const CONSISTENCY_LABELS: Record<keyof ReturnType<typeof computeWorksheetConsistency>, string> = {
  maxCpcRecap: "Max CPC (1.2) matches the recap (1.5)",
  breakEvenAcos: "Break-even ACoS (1.3) matches the profit margin (1.3)",
  minimumRoas: "Minimum ROAS (1.4) equals 1 / profit margin (1.3)",
};

export function Module1WorksheetReadView({
  summary,
}: Module1WorksheetReadViewProps): ReactElement {
  const { snapshot, lessons, consistency } = summary;
  const hasAnyData = lessons.some((l) => l.hasData);

  if (!hasAnyData) {
    return (
      <section className={styles.readView} aria-labelledby="module1-readview-title">
        <header className={styles.header}>
          <span className={styles.eyebrow}>Your Module 1 worksheet</span>
          <h2 id="module1-readview-title" className={styles.title}>
            You have not saved any numbers yet
          </h2>
          <p className={styles.subtitle}>
            The one-page summary below fills in as you save notes in
            Lessons 1.1 through 1.5. Open any of them, fill in the
            worksheet at the end of each main section, and click Save
            notes. Your numbers will show up here.
          </p>
        </header>
        <ul className={styles.emptyLinks}>
          {lessons.map((lesson) => (
            <li key={lesson.lessonSlug}>
              <Link
                href={`/courses/foundations/lessons/${lesson.lessonSlug}`}
                className={styles.emptyLink}
              >
                Open {LESSON_TITLES[lesson.lessonSlug] ?? lesson.lessonSlug}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={styles.readView} aria-labelledby="module1-readview-title">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Your Module 1 worksheet</span>
        <h2 id="module1-readview-title" className={styles.title}>
          Everything you wrote, on one page
        </h2>
        <p className={styles.subtitle}>
          A read-only view of the rows you saved across Lessons 1.1
          through 1.5. The numbers you typed are checked against each
          other below, so you can spot a typo before it costs a
          decision on a real account.
        </p>
      </header>

      <div className={styles.snapshotGrid}>
        {SNAPSHOT_FIELDS.map((section) => (
          <article key={section.section} className={styles.snapshotCard}>
            <h3 className={styles.snapshotCardTitle}>{section.section}</h3>
            <dl className={styles.snapshotList}>
              {section.rows.map((row) => (
                <div key={row.value} className={styles.snapshotRow}>
                  <dt className={styles.snapshotLabel}>{row.label}</dt>
                  <dd
                    className={styles.snapshotValue}
                    data-empty={
                      snapshot[row.value as keyof Module1RowSnapshot] === ""
                    }
                  >
                    {formatValue(snapshot[row.value as keyof Module1RowSnapshot])}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <article className={styles.consistency} aria-labelledby="consistency-title">
        <header className={styles.consistencyHead}>
          <h3 id="consistency-title" className={styles.consistencyTitle}>
            Cross-row consistency
          </h3>
          <p className={styles.consistencySubtitle}>
            Three checks the lessons themselves teach. A drift here
            usually means a typo, not a different model.
          </p>
        </header>
        <ul className={styles.consistencyList}>
          {(Object.keys(CONSISTENCY_LABELS) as (keyof typeof CONSISTENCY_LABELS)[]).map(
            (key) => {
              const check = consistency[key];
              return (
                <li
                  key={key}
                  className={styles.consistencyItem}
                  data-status={check.status}
                >
                  <span className={styles.consistencyLabel}>
                    {CONSISTENCY_LABELS[key]}
                  </span>
                  <ConsistencyBadge check={check} />
                </li>
              );
            },
          )}
        </ul>
      </article>

      <footer className={styles.readViewFooter}>
        <p className={styles.readViewFooterNote}>
          Edit any number by reopening the lesson that holds the row.
          This page re-renders the next time you load it.
        </p>
        <ul className={styles.lessonLinks}>
          {lessons.map((lesson) => (
            <li key={lesson.lessonSlug}>
              <Link
                href={`/courses/foundations/lessons/${lesson.lessonSlug}`}
                className={styles.lessonLink}
                data-empty={!lesson.hasData}
              >
                {LESSON_TITLES[lesson.lessonSlug] ?? lesson.lessonSlug}
                {lesson.hasData ? null : <span className={styles.lessonLinkEmpty}>empty</span>}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </section>
  );
}

function ConsistencyBadge({ check }: { readonly check: ConsistencyCheck }): ReactElement {
  if (check.status === "ok") {
    return (
      <span className={`${styles.consistencyBadge} ${styles.consistencyBadgeOk}`}>
        OK
      </span>
    );
  }
  if (check.status === "drift") {
    return (
      <span className={`${styles.consistencyBadge} ${styles.consistencyBadgeDrift}`}>
        {check.reason ?? "Drift"}
      </span>
    );
  }
  return (
    <span className={`${styles.consistencyBadge} ${styles.consistencyBadgeUnknown}`}>
      Not enough data
    </span>
  );
}

function formatValue(value: string | undefined): string {
  if (!value || value.trim().length === 0) return "—";
  return value;
}

export type { Module1LessonSnapshot };
