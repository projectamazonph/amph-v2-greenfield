import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Curriculum.module.css";

interface Module {
  n: string;
  name: string;
  tier: "Foundations" | "Mastery";
  hours: string;
}

const MODULES: Module[] = [
  { n: "01", name: "Amazon Ads fundamentals", tier: "Foundations", hours: "2h" },
  { n: "02", name: "Sponsored Products structure", tier: "Foundations", hours: "3h" },
  { n: "03", name: "Search-term triage and negation", tier: "Foundations", hours: "3h" },
  { n: "04", name: "Bidding and budget pacing", tier: "Foundations", hours: "3h" },
  { n: "05", name: "Reporting and client comms", tier: "Foundations", hours: "3h" },
  { n: "06", name: "Sponsored Brands and Display", tier: "Mastery", hours: "4h" },
  { n: "07", name: "Listing audit and on-page fixes", tier: "Mastery", hours: "4h" },
  { n: "08", name: "Keyword research for new products", tier: "Mastery", hours: "4h" },
];

export function Curriculum() {
  return (
    <section className={shared.sec} id="curriculum">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§03 / THE CURRICULUM</span>
            <h2 className={shared.secTitle}>Eight modules, in order. No surprises.</h2>
          </div>
          <p className={shared.secLede}>
            Modules 1–5 are <b>Foundations</b>; 6–8 are <b>Mastery</b>. No jumping around, no hidden
            &ldquo;advanced&rdquo; paywall mid-course — the tier you pick decides how far you go,
            not whether you can see the map.
          </p>
        </div>

        <Reveal className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 58 }}>Mod</th>
                <th>Topic</th>
                <th>Tier</th>
                <th className={styles.right}>Time</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.n}>
                  <td className={styles.mod} data-l="Mod">
                    {m.n}
                  </td>
                  <td className={styles.name} data-l="Topic">
                    {m.name}
                  </td>
                  <td data-l="Tier">
                    <span
                      className={[styles.tierPill, m.tier === "Mastery" ? styles.mastery : ""].join(
                        " ",
                      )}
                    >
                      {m.tier}
                    </span>
                  </td>
                  <td className={styles.hours} data-l="Time">
                    {m.hours}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>8 modules · Foundations (1–5) + Mastery (6–8)</td>
                <td className={styles.right}>
                  <b>26h</b> of lessons
                </td>
              </tr>
            </tfoot>
          </table>
        </Reveal>
        <p className={styles.note}>
          <b>~40h</b> realistic completion once you include the simulators, quizzes and templates ·
          most students finish Foundations in 4–6 weeks at 5–8 hrs/week; Mastery adds 2–3 weeks.
        </p>
      </div>
    </section>
  );
}
