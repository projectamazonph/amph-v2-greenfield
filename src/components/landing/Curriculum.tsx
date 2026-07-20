/**
 * Curriculum — landing page section 6.
 * Course structure as a dense table. Mastery's extras are visible.
 */

import styles from "./Curriculum.module.css";

interface Module {
  number: number;
  title: string;
  tier: "foundations" | "mastery";
  duration: string;
}

const MODULES: ReadonlyArray<Module> = [
  { number: 1, title: "Amazon Ads fundamentals", tier: "foundations", duration: "2h" },
  { number: 2, title: "Sponsored Products structure", tier: "foundations", duration: "3h" },
  { number: 3, title: "Search-term triage and negation", tier: "foundations", duration: "3h" },
  { number: 4, title: "Bidding and budget pacing", tier: "foundations", duration: "3h" },
  { number: 5, title: "Reporting and client comms", tier: "foundations", duration: "3h" },
  { number: 6, title: "Sponsored Brands and Display", tier: "mastery", duration: "4h" },
  { number: 7, title: "Listing audit and on-page fixes", tier: "mastery", duration: "4h" },
  { number: 8, title: "Keyword research for new products", tier: "mastery", duration: "4h" },
];

export function Curriculum() {
  return (
    <section className={styles.section} aria-labelledby="curriculum-heading">
      <div className={styles.inner}>
        <div className={styles.layout}>
          <div>
            <h2 id="curriculum-heading" className={styles.heading}>
              Course structure
            </h2>
            <p className={styles.subhead}>
              Eight modules in order. Modules 1–5 are Foundations. Modules 6–8 are Mastery. No
              jumping around, no "advanced" surprises.
            </p>
          </div>
          <div>
            <h3 className={styles.timeHeading}>How long does it take?</h3>
            <p className={styles.timeBody}>
              Most students finish Foundations in 4–6 weeks at 5–8 hours a week. Mastery adds
              another 2–3 weeks on top.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.thNum}>
                  #
                </th>
                <th scope="col" className={styles.thModule}>
                  Module
                </th>
                <th scope="col" className={styles.thTier}>
                  Tier
                </th>
                <th scope="col" className={styles.thDuration}>
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.number}>
                  <td className={styles.tdNum}>
                    <span className={styles.numMono}>{m.number}</span>
                  </td>
                  <td className={styles.tdModule}>{m.title}</td>
                  <td className={styles.tdTier}>
                    <span
                      className={m.tier === "mastery" ? styles.tierMastery : styles.tierFoundations}
                    >
                      {m.tier === "mastery" ? "Mastery" : "Foundations"}
                    </span>
                  </td>
                  <td className={styles.tdDuration}>
                    <span className={styles.numMono}>{m.duration}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
