/**
 * KeywordResearchForm — client component.
 *
 * Takes a niche as input, runs keyword research, and displays
 * a filterable/sortable keyword table with priority badges.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./KeywordResearchForm.module.css";
import {
  runKeywordResearch,
  type KeywordResearchResult,
} from "@/app/tools/keyword-research/actions";
import type { KeywordResult } from "@/domain/simulator/listing-audit/ListingAuditOutput";

interface Props {
  initialNiche: string;
}

type PriorityFilter = "all" | KeywordResult["priority"];

export function KeywordResearchForm({ initialNiche }: Props) {
  const [niche, setNiche] = useState(initialNiche);
  const [filter, setFilter] = useState<PriorityFilter>("all");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<KeywordResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await runKeywordResearch({ niche });
      if (r.ok) {
        setResult(r);
      } else {
        setError(r.error.message);
      }
    });
  };

  const keywords = result?.ok ? result.value.keywords : [];
  const filtered = filter === "all" ? keywords : keywords.filter((k) => k.priority === filter);

  const totalVolume = keywords.reduce((s, k) => s + k.searchVolumeEstimate, 0);

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={onSubmit}>
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
            {pending ? "Researching…" : "Generate keywords"}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>

      {result?.ok ? (
        <div className={styles.results}>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Keywords</span>
              <span className={styles.summaryValue}>{keywords.length}</span>
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Est. volume</span>
              <span className={styles.summaryValue}>{totalVolume.toLocaleString()}/mo</span>
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>High priority</span>
              <span className={styles.summaryValue}>
                {keywords.filter((k) => k.priority === "high").length}
              </span>
            </span>
          </div>

          <div className={styles.filters}>
            {(["all", "high", "medium", "low"] as PriorityFilter[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(f)}
                type="button"
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Keyword results"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th className={styles.thNum}>Volume/mo</th>
                  <th className={styles.thNum}>Competition</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr key={k.keyword}>
                    <td className={styles.tdKw}>{k.keyword}</td>
                    <td className={styles.tdNum}>{k.searchVolumeEstimate.toLocaleString()}</td>
                    <td className={styles.tdNum}>
                      <span className={styles.competition} data-comp={k.competition}>
                        {k.competition}
                      </span>
                    </td>
                    <td>
                      <span className={styles.priority} data-priority={k.priority}>
                        {k.priority}
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
