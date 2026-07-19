/**
 * Practice — landing page section 4 (replaces the old Simulators section).
 *
 * Honest version. The domain simulator logic exists (700 LOC across
 * 4 simulators) but the student-facing UI is in development. We
 * promise the tools; we don't pretend they're done.
 */

import styles from "./Practice.module.css";

interface Tool {
  name: string;
  whatItDoes: string;
  status: "in_development";
}

const TOOLS: ReadonlyArray<Tool> = [
  {
    name: "Bid Elevator",
    whatItDoes: "Move a slider, see how bid changes shift ACoS and sales in real time.",
    status: "in_development",
  },
  {
    name: "Campaign Builder",
    whatItDoes: "Build a Sponsored Products structure from a brief. Catch over-bids before launch.",
    status: "in_development",
  },
  {
    name: "Search Term Triage",
    whatItDoes: "Sort through a real search-term report. Mark EXACT or NEGATE. Write the rationale.",
    status: "in_development",
  },
  {
    name: "Listing Audit",
    whatItDoes: "Score a listing against the same checklist our team uses. Walk away with the fixes.",
    status: "in_development",
  },
  {
    name: "Keyword Research",
    whatItDoes: "Expand a seed term into a working keyword set. Filter by volume, CPC, and intent.",
    status: "in_development",
  },
];

export function Practice() {
  return (
    <section className={styles.section} aria-labelledby="practice-heading">
      <div className={styles.inner}>
        <h2 id="practice-heading" className={styles.heading}>
          You don't just watch lessons.
        </h2>
        <p className={styles.subhead}>
          The course includes practice tools — the same kind we use on
          client accounts. The student-facing UI is in development; the
          domain logic behind each tool is built and tested.
        </p>
        <ul className={styles.list}>
          {TOOLS.map((tool) => (
            <li key={tool.name} className={styles.row}>
              <div className={styles.rowMain}>
                <h3 className={styles.toolName}>{tool.name}</h3>
                <p className={styles.toolBody}>{tool.whatItDoes}</p>
              </div>
              <span className={styles.badge} aria-label="In development">
                In development
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Sign up to the waitlist below to get notified when the first
          simulator ships.
        </p>
      </div>
    </section>
  );
}
