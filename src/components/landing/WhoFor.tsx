import { CheckIcon, CrossIcon } from "./Icons";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./WhoFor.module.css";

const YES: React.ReactNode[] = [
  <>
    You do <b>VA work now</b> and want to specialize into Amazon ads.
  </>,
  <>
    You can commit <b>5–8 hours a week for 11 weeks</b>.
  </>,
  <>
    You want to move from <b>₱25k to ₱60k&ndash;₱80k / month</b>.
  </>,
];

const NO: React.ReactNode[] = [
  "You already run Amazon ads at scale. You probably want a different course.",
  <>
    You want to learn <b>Amazon FBA selling</b>, not the agency-side ads work.
  </>,
  <>
    You want a <b>free course</b>. This one is paid, and we&rsquo;d rather you waited than paid for
    something you can&rsquo;t finish.
  </>,
];

export function WhoFor() {
  return (
    <section className={shared.sec} id="whofor" style={{ paddingTop: 0 }}>
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§04 / WHO IT&rsquo;S FOR</span>
            <h2 className={shared.secTitle}>A paid course.</h2>
          </div>
          <p className={shared.secLede}>
            A paid course changes how you show up. You finish it because you paid for it. This is
            built for VAs ready to specialize, and it&rsquo;s honest about who should wait.
          </p>
        </div>

        <Reveal className={styles.grid}>
          <div className={[styles.card, styles.yes].join(" ")}>
            <h3>
              <span className={styles.icon}>
                <CheckIcon />
              </span>
              This is for you if
            </h3>
            <span className={styles.sub}>You&rsquo;ll get your money&rsquo;s worth</span>
            <ul>
              {YES.map((item, i) => (
                <li key={i}>
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={[styles.card, styles.no].join(" ")}>
            <h3>
              <span className={styles.icon}>
                <CrossIcon />
              </span>
              This isn&rsquo;t for you if
            </h3>
            <span className={styles.sub}>Save your money for now</span>
            <ul>
              {NO.map((item, i) => (
                <li key={i}>
                  <CrossIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
