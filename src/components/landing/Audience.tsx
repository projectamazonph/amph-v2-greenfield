/**
 * Audience — landing page section 3.
 * "This is for you if / not for you if."
 * Two-column. Be honest so the wrong people bounce.
 */

import styles from "./Audience.module.css";

const FOR_YOU: ReadonlyArray<string> = [
  "You do VA work now and want to specialize into Amazon ads.",
  "You can commit 5–8 hours a week for 8 weeks.",
  "You want to charge ₱60k–₱80k/month, not stay at ₱25k.",
];

const NOT_FOR_YOU: ReadonlyArray<string> = [
  "You already run Amazon ads at scale (you probably want a different course).",
  "You want to learn Amazon FBA selling, not the agency-side ads work.",
  "You want a free course. This one is paid; we think it should be.",
];

function Check() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="var(--success)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="var(--ink-500)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Audience() {
  return (
    <section className={styles.section} aria-labelledby="audience-heading">
      <div className={styles.inner}>
        <h2 id="audience-heading" className={styles.heading}>
          Who this is for
        </h2>
        <div className={styles.grid}>
          <div className={styles.column}>
            <h3 className={styles.subhead}>This is for you if</h3>
            <ul className={styles.list}>
              {FOR_YOU.map((item) => (
                <li key={item} className={styles.item}>
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.column}>
            <h3 className={styles.subheadMuted}>This isn't for you if</h3>
            <ul className={styles.list}>
              {NOT_FOR_YOU.map((item) => (
                <li key={item} className={styles.item}>
                  <Cross />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
