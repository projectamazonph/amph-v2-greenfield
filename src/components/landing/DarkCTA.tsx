import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./DarkCTA.module.css";

const COURSES_URL = "https://projectamazonph.online";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function DarkCTA() {
  return (
    <section className={styles.darkcta}>
      <div className={[shared.wrap, styles.wrap].join(" ")}>
        <div className={styles.grid}>
          <Reveal>
            <span className={[shared.label, styles.label].join(" ")}>Pick your tier</span>
            <h2 className={styles.h2}>
              Stop watching.
              <br />
              <em>Start deciding.</em>
            </h2>
            <p className={styles.p}>
              Pay once, get the content forever. Build Amazon ads skills you can actually show —
              guided modules, five scored simulators, and a certificate recognized in our hiring
              pipeline.
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
                href={COURSES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Email me the syllabus
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
                Certificate on completion
              </li>
              <li>
                <CheckIcon />
                Recognized in our hiring pipeline
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
