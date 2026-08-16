import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Curriculum.module.css";
import {
  formatPlannedMinutes,
  PUBLIC_CURRICULUM_CLAIMS,
  publicCourseClaims,
} from "@/domain/curriculum/PublicCurriculumClaims";

interface Module {
  n: string;
  name: string;
  tier: "Foundations" | "Mastery";
  time: string;
}

const MODULES: Module[] = PUBLIC_CURRICULUM_CLAIMS.modules.map((module) => ({
  n: String(module.moduleNumber).padStart(2, "0"),
  name: module.name,
  tier: module.courseSlug === "ppc-foundations" ? "Foundations" : "Mastery",
  time: formatPlannedMinutes(module.plannedMinutes),
}));

const FOUNDATIONS = publicCourseClaims("ppc-foundations");
const MASTERY = publicCourseClaims("accelerated-mastery");
const TOTAL_LESSONS = FOUNDATIONS.lessonCount + MASTERY.lessonCount;
const TOTAL_MINUTES = FOUNDATIONS.plannedMinutes + MASTERY.plannedMinutes;

export function Curriculum() {
  return (
    <section className={shared.sec} id="curriculum">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§03 / THE CURRICULUM</span>
            <h2 className={shared.secTitle}>
              {PUBLIC_CURRICULUM_CLAIMS.modules.length} modules, in order. No hidden gates.
            </h2>
          </div>
          <p className={shared.secLede}>
            Modules 0&ndash;4 are <b>Foundations</b>; 5&ndash;8 are <b>Mastery</b>. The tier you
            pick decides how far you go. No jumping around, no hidden &ldquo;advanced&rdquo;
            paywall mid-course.
          </p>
        </div>

        <Reveal className={styles.tableScroll}>
          <table className={styles.table}>
            {/* M-R30 fix: <caption className="sr-only"> provides WCAG 1.3.1
                accessible name; scope="col" on every header associates cells
                with their column header for screen readers. */}
            <caption className="sr-only">Curriculum modules, tier, and time</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 58 }}>Mod</th>
                <th scope="col">Topic</th>
                <th scope="col">Tier</th>
                <th scope="col" className={styles.right}>Time</th>
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
                    {m.time}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  {PUBLIC_CURRICULUM_CLAIMS.modules.length} modules · Foundations (0–4) + Mastery
                  (5–8)
                </td>
                <td className={styles.right}>
                  <b>{formatPlannedMinutes(TOTAL_MINUTES)}</b> of lessons
                </td>
              </tr>
            </tfoot>
          </table>
        </Reveal>
        <p className={styles.note}>
          <b>{TOTAL_LESSONS} lessons</b> · {formatPlannedMinutes(TOTAL_MINUTES)} of planned lesson
          time. Practice, quizzes, and templates add time; the public figure is the source lesson
          estimate, not a promise of job readiness.
        </p>
      </div>
    </section>
  );
}
