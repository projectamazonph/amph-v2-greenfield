/**
 * BidElevatorForm — client component.
 *
 * Renders the scenario's seed keywords as a table of editable bids.
 * The user tweaks the bid (₱ value) per keyword, then submits. The
 * server action runs the simulator and returns the result; the
 * parent page re-renders with the new result panel.
 *
 * Default values come from the Stitch spec: a high-spend
 * electronics campaign with 8 keywords. Currency is in USD.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./BidElevatorForm.module.css";
import { runBidElevator, type RunBidElevatorInput } from "@/app/tools/bid-elevator/actions";

export interface SeedKeyword {
  keyword: string;
  currentBid: number;
  currentCpc: number;
  volume: number;
}

interface Props {
  budget: number;
  targetRoas: number;
  initialKeywords: ReadonlyArray<SeedKeyword>;
}

export function BidElevatorForm({ budget, targetRoas, initialKeywords }: Props) {
  const router = useRouter();
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialKeywords.map((k) => [k.keyword, k.currentBid])),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = (keyword: string, value: number) => {
    setBids((prev) => ({ ...prev, [keyword]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: RunBidElevatorInput = {
      budget,
      targetRoas,
      keywords: initialKeywords.map((k) => ({
        ...k,
        currentBid: bids[k.keyword] ?? k.currentBid,
      })),
    };
    startTransition(async () => {
      const result = await runBidElevator(input);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      // Stash the result in sessionStorage for the page to read
      // (a clean re-fetch pattern would be a real route param;
      // this works without adding another route segment).
      sessionStorage.setItem("bid-elevator:result", JSON.stringify(result.value));
      router.refresh();
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Daily budget</span>
          <span className={styles.metaValue}>₱{budget.toLocaleString()}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Target ROAS</span>
          <span className={styles.metaValue}>{targetRoas.toFixed(1)}×</span>
        </span>
      </div>
      <div className={styles.tableScroll} role="region" aria-label="Bid inputs" tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Keyword</th>
              <th className={styles.thNum}>Volume</th>
              <th className={styles.thNum}>Est. CPC</th>
              <th className={styles.thNum}>Your bid</th>
            </tr>
          </thead>
          <tbody>
            {initialKeywords.map((k) => (
              <tr key={k.keyword}>
                <td className={styles.tdKw}>{k.keyword}</td>
                <td className={styles.tdNum}>{k.volume.toLocaleString()}</td>
                <td className={styles.tdNum}>₱{k.currentCpc.toFixed(2)}</td>
                <td className={styles.tdNum}>
                  <span className={styles.inputWrap}>
                    <span className={styles.inputPrefix}>₱</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      className={styles.input}
                      value={bids[k.keyword] ?? k.currentBid}
                      onChange={(e) => onChange(k.keyword, Number(e.target.value))}
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
    </form>
  );
}
