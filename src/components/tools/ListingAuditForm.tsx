/**
 * ListingAuditForm — client component.
 *
 * Pre-fills a listing (title, bullets, description) and lets the
 * student revise it. Submits to the auditListing action and shows
 * the score + per-field findings + a keyword research list.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./ListingAuditForm.module.css";
import {
  auditListing,
  type AuditListingResult,
} from "@/app/tools/listing-audit/actions";

interface Props {
  initialTitle: string;
  initialBullets: ReadonlyArray<string>;
  initialDescription: string;
  category: string;
  niche: string;
}

export function ListingAuditForm({
  initialTitle,
  initialBullets,
  initialDescription,
  category,
  niche,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [bullets, setBullets] = useState<string[]>([...initialBullets]);
  const [description, setDescription] = useState(initialDescription);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuditListingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateBullet = (i: number, value: string) => {
    setBullets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await auditListing({
        title,
        bullets: bullets.filter((b) => b.length > 0),
        description,
        category,
        niche,
      });
      if (r.ok) {
        setResult(r);
      } else {
        setError(r.error.message);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="la-title">Title</label>
        <input
          id="la-title"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Bullets ({bullets.length})</span>
        <div className={styles.bullets}>
          {bullets.map((b, i) => (
            <div key={i} className={styles.bulletRow}>
              <span className={styles.bulletNum}>{i + 1}</span>
              <input
                className={styles.input}
                value={b}
                onChange={(e) => updateBullet(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="la-description">Description</label>
        <textarea
          id="la-description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Auditing…" : "Run audit"}
        </button>
        {result && result.ok ? (
          <div
            className={styles.score}
            style={{
              color:
                result.value.score >= 80
                  ? "var(--success)"
                  : result.value.score >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {result.value.score}%
          </div>
        ) : null}
      </div>
      {result && result.ok ? (
        <div className={styles.findings}>
          <h3 className={styles.findingsTitle}>Findings</h3>
          <ul className={styles.findingsList}>
            {result.value.audit.findings.map((f, i) => (
              <li key={i} className={styles.finding}>
                <span
                  className={styles.findingSev}
                  data-sev={f.severity}
                >
                  {f.severity}
                </span>
                <span className={styles.findingCategory}>{f.category}</span>
                <span className={styles.findingMessage}>{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
