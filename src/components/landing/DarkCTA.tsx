import { COURSES_URL } from "./constants";
import { CheckIcon } from "./Icons";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./DarkCTA.module.css";
import { PUBLIC_CURRICULUM_CLAIMS } from "@/domain/curriculum/PublicCurriculumClaims";

export function DarkCTA() {
  return (
    <section className={styles.darkcta}>
      <div className={[shared.wrap, styles.wrap].join(" ")}>
        <div className={styles.grid}>
          <Reveal>
            <span className={[shared.label, styles.label].join(" ")}>Pick your tier</span>
            <h2 className={styles.h2}>
              Build the skill.
              <br />
              <em>Show the work.</em>
            </h2>
            <p className={styles.p}>
              Pay once, get the content forever. Build Amazon ads skills you can show: guided
              modules, reviewed practice tools, and a {PUBLIC_CURRICULUM_CLAIMS.certificate.label.toLowerCase()}.
            </p>
            <div className={styles.ctaRow}>
              <a
                className={[shared.btn, shared.btnPrimary].join(" ")}
                href={COURSES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                See the courses <span className={shared.arr}>→</span>
              </a>
              <a
                className={[shared.btn, shared.btnGhost, styles.ghost].join(" ")}
                href="#curriculum"
              >
                See what&rsquo;s inside
              </a>
            </div>
            <p className={styles.latenight}>
              Reading this at <b>11pm after a long shift?</b> Save the link. Come back when
              you&rsquo;re ready.
            </p>
          </Reveal>

          <Reveal className={styles.card}>
            <span className={styles.mono}>True in every tier</span>
            <ul>
              <li>
                <CheckIcon />
                The first module is identical
              </li>
              <li>
                <CheckIcon />
                {PUBLIC_CURRICULUM_CLAIMS.certificate.label}
              </li>
              <li>
                <CheckIcon />
                {PUBLIC_CURRICULUM_CLAIMS.certificate.claim}
              </li>
              <li>
                <CheckIcon />
                One-time payment · no subscription
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
