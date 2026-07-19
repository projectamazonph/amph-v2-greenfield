/**
 * FinalCTA — landing page section 8.
 * Last pitch. One primary, one ghost. No "are you ready?" filler.
 */

import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <div className={styles.inner}>
        <h2 id="final-cta-heading" className={styles.heading}>
          Pick your tier. Start tonight.
        </h2>
        <p className={styles.subhead}>
          Pay once, get the content forever. The first module is the same in
          every tier; the difference is how far you go.
        </p>
        <div className={styles.actions}>
          <a href="#pricing" className={styles.primary}>
            See the courses
          </a>
          <a href="mailto:hello@projectamazon.ph?subject=Syllabus" className={styles.ghost}>
            Email me the syllabus
          </a>
        </div>
        <p className={styles.note}>
          Reading this at 11pm after a long shift? Save the link. Come back when
          you're ready.
        </p>
      </div>
    </section>
  );
}
