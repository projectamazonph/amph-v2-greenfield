/**
 * ConnectedAccountForm — client component.
 *
 * STORY-089. Renders the mock Amazon Advertising API snapshot: the
 * campaign's keyword economics as editable bid rows, and the Search
 * Term Report as triage action rows. The student adjusts bids and
 * triages, then submits; the server action runs the simulator and
 * the result renders inline via ConnectedAccountResult.
 *
 * Only the student's bid adjustments and triage decisions are sent —
 * the scenario's economics and search terms are resolved server-side
 * from the currently published scenario, not echoed back from this
 * component's props. Same trust-gap fix STORY-085 applied to the
 * other 5 simulators.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./ConnectedAccountForm.module.css";
import { connectedAccountAttempt } from "@/app/tools/connected-account/actions";
import type { ConnectedAccountScenarioContent } from "@/app/tools/connected-account/scenarioContent";
import type {
  ConnectedAccountOutput,
  ConnectedAccountTriageAction,
} from "@/domain/simulator/connected-account";
import { ConnectedAccountResult } from "./ConnectedAccountResult";
import { SimulatorModeToggle, type PracticeOrChallengeMode } from "./SimulatorModeToggle";
import { studentErrorCopy } from "@/lib/studentErrorCopy";

interface Props {
  scenario: ConnectedAccountScenarioContent;
}

const TRIAGE_OPTIONS: ReadonlyArray<{
  value: ConnectedAccountTriageAction;
  label: string;
}> = [
  { value: "keep", label: "Keep" },
  { value: "optimize", label: "Optimize" },
  { value: "pause", label: "Pause" },
  { value: "negate_exact", label: "Neg. exact" },
  { value: "negate_phrase", label: "Neg. phrase" },
];

export function ConnectedAccountForm({ scenario }: Props) {
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(scenario.keywords.map((k) => [k.keywordId, k.currentBidMinor])),
  );
  const [triage, setTriage] = useState<Record<string, ConnectedAccountTriageAction>>(() =>
    Object.fromEntries(scenario.searchTerms.map((t) => [t.termId, "keep" as const])),
  );
  const [mode, setMode] = useState<PracticeOrChallengeMode>("practice");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<ConnectedAccountOutput | null>(null);

  const onBidChange = (keywordId: string, value: number) => {
    setBids((prev) => ({ ...prev, [keywordId]: value }));
  };

  const onTriageChange = (termId: string, value: ConnectedAccountTriageAction) => {
    setTriage((prev) => ({ ...prev, [termId]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const bidDecisions = Object.entries(bids).map(([keywordId, newBidMinor]) => ({
          keywordId,
          newBidMinor,
        }));
        const triageDecisions = Object.entries(triage).map(([termId, action]) => ({
          termId,
          action,
        }));
        const response = await connectedAccountAttempt({
          bidDecisions,
          triageDecisions,
          mode,
        });
        if (!response.ok) {
          setError(
            "message" in response.error ? response.error.message : studentErrorCopy.simulatorRun,
          );
          return;
        }
        setSimResult(response.value.output);
      } catch {
        setError(studentErrorCopy.simulatorRun);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <SimulatorModeToggle mode={mode} onChange={setMode} unlocked={false} />
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Campaign</span>
          <span className={styles.metaValue}>{scenario.campaignName}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Daily budget</span>
          <span className={styles.metaValue}>
            ₱{(scenario.dailyBudgetMinor / 100).toLocaleString()}
          </span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Target ACoS</span>
          <span className={styles.metaValue}>{scenario.targetAcosPct}%</span>
        </span>
      </div>

      <section className={styles.section} aria-labelledby="ca-keywords-title">
        <h2 id="ca-keywords-title" className={styles.sectionTitle}>
          Keyword bids
        </h2>
        <div className={styles.tableScroll} role="region" aria-label="Keyword bids" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Keyword</th>
                <th scope="col">Match</th>
                <th scope="col" className={styles.thNum}>
                  Impr.
                </th>
                <th scope="col" className={styles.thNum}>
                  Clicks
                </th>
                <th scope="col" className={styles.thNum}>
                  Spend
                </th>
                <th scope="col" className={styles.thNum}>
                  Sales
                </th>
                <th scope="col" className={styles.thNum}>
                  Your bid
                </th>
              </tr>
            </thead>
            <tbody>
              {scenario.keywords.map((k) => (
                <tr key={k.keywordId}>
                  <td className={styles.tdKw}>{k.keyword}</td>
                  <td>
                    <code className={styles.matchTag}>{k.matchType}</code>
                  </td>
                  <td className={styles.tdNum}>{k.impressions.toLocaleString()}</td>
                  <td className={styles.tdNum}>{k.clicks.toLocaleString()}</td>
                  <td className={styles.tdNum}>₱{(k.spendMinor / 100).toLocaleString()}</td>
                  <td className={styles.tdNum}>₱{(k.salesMinor / 100).toLocaleString()}</td>
                  <td className={styles.tdNum}>
                    <span className={styles.inputWrap}>
                      <span className={styles.inputPrefix}>₱</span>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        className={styles.input}
                        value={(bids[k.keywordId] ?? k.currentBidMinor) / 100}
                        onChange={(e) =>
                          onBidChange(k.keywordId, Math.round(Number(e.target.value) * 100))
                        }
                        aria-label={`Bid for ${k.keyword}`}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ca-terms-title">
        <h2 id="ca-terms-title" className={styles.sectionTitle}>
          Search Term Report triage
        </h2>
        <div className={styles.tableScroll} role="region" aria-label="STR triage" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Search term</th>
                <th scope="col" className={styles.thNum}>
                  Clicks
                </th>
                <th scope="col" className={styles.thNum}>
                  Spend
                </th>
                <th scope="col" className={styles.thNum}>
                  Sales
                </th>
                <th scope="col" className={styles.thNum}>
                  Orders
                </th>
                <th scope="col">Triage</th>
              </tr>
            </thead>
            <tbody>
              {scenario.searchTerms.map((t) => (
                <tr key={t.termId}>
                  <td className={styles.tdKw}>{t.term}</td>
                  <td className={styles.tdNum}>{t.clicks.toLocaleString()}</td>
                  <td className={styles.tdNum}>₱{(t.spendMinor / 100).toLocaleString()}</td>
                  <td className={styles.tdNum}>₱{(t.salesMinor / 100).toLocaleString()}</td>
                  <td className={styles.tdNum}>{t.orders.toLocaleString()}</td>
                  <td>
                    <select
                      className={styles.triageSelect}
                      value={triage[t.termId] ?? "keep"}
                      onChange={(e) =>
                        onTriageChange(t.termId, e.target.value as ConnectedAccountTriageAction)
                      }
                      aria-label={`Triage for ${t.term}`}
                    >
                      {TRIAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={pending} aria-busy={pending}>
        {pending ? "Running…" : "Run scenario"}
      </button>
      {simResult ? <ConnectedAccountResult result={simResult} /> : null}
    </form>
  );
}
