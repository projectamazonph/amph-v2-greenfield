/**
 * Numbers — landing page section 2.
 * Social proof without testimonials. Mono numbers, dense.
 */

import styles from "./Numbers.module.css";

const STATS: ReadonlyArray<{
  figure: string;
  label: string;
  body: string;
}> = [
  {
    figure: "8",
    label: "modules",
    body: "From search-term structure to listing audits, in order.",
  },
  {
    figure: "5",
    label: "simulators",
    body: "Practice on the same tools we use on client accounts.",
  },
  {
    figure: "~40h",
    label: "to complete",
    body: "Foundations + Mastery at 5–8 hours a week.",
  },
  {
    figure: "₱2,500",
    label: "first-client lift",
    body: "The gap between a junior VA rate and a specialist's, on the first PPC client.",
  },
];

export function Numbers() {
  return (
    <section className={styles.section} aria-labelledby="numbers-heading">
      <div className={styles.inner}>
        <h2 id="numbers-heading" className={styles.heading}>
          What the training gets you
        </h2>
        <ul className={styles.grid}>
          {STATS.map((s) => (
            <li key={s.label} className={styles.card}>
              <div className={styles.figure}>{s.figure}</div>
              <div className={styles.label}>{s.label}</div>
              <p className={styles.body}>{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
