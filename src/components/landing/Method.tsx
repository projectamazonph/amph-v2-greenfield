import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Method.module.css";

const STEPS = [
  {
    n: "01",
    tag: "Read",
    title: "See the real shape of the data",
    body: "Start from the report, not the button. Learn what ACoS, TACoS, CTR and CVR actually tell you before you touch a bid.",
    outLabel: "You produce",
    out: "A weekly readout you can explain out loud",
  },
  {
    n: "02",
    tag: "Decide",
    title: "Make the call in a simulator",
    body: "Set bids, triage search terms, build a campaign from a brief, all on safe, illustrative data. Wrong moves cost nothing here.",
    outLabel: "You produce",
    out: "A bid log with your reasoning written down",
  },
  {
    n: "03",
    tag: "Scored",
    title: "Get instant feedback, then a human one",
    body: "The tools score your moves on the spot. In Ultimate, Ryan reviews the actual decisions the way a client or manager would.",
    outLabel: "You produce",
    out: "A portfolio-ready case study",
  },
  {
    n: "04",
    tag: "Repeat",
    title: "Carry the instinct to client work",
    body: "By the time a real account is on the line, the pattern is muscle memory, not a screenshot you memorised.",
    outLabel: "You carry",
    out: "A certificate recognized in our hiring pipeline",
  },
];

export function Method() {
  return (
    <section className={shared.sec} id="method">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§01 / THE METHOD</span>
            <h2 className={shared.secTitle}>You don&rsquo;t just watch lessons.</h2>
          </div>
          <p className={shared.secLede}>
            Five interactive simulators: the same tools we use on real client accounts. Practice
            with real data, <b>get scored instantly</b>, then carry the instinct into paid work.
            Here is the loop every module runs.
          </p>
        </div>

        <Reveal className={styles.list}>
          {STEPS.map((step) => (
            <div className={styles.row} key={step.n}>
              <span className={styles.n}>{step.n}</span>
              <span className={styles.tag}>{step.tag}</span>
              <div className={styles.body}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className={styles.out}>
                <small>{step.outLabel}</small>
                {step.out}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
