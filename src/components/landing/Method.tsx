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
    title: "Try a decision in a simulator",
    body: "Set bids, sort search terms, build a campaign from a brief, all on safe, illustrative data. Wrong moves cost nothing here.",
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
    title: "Carry the pattern to client work",
    body: "By the time a real account is in your hands, the pattern is already there. It isn&rsquo;t something you memorised from a screenshot.",
    outLabel: "You carry",
    out: "A certificate recognized by our hiring team",
  },
];

export function Method() {
  return (
    <section className={shared.sec} id="method">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§01 / THE METHOD</span>
            <h2 className={shared.secTitle}>Reading isn&rsquo;t enough.</h2>
          </div>
          <p className={shared.secLede}>
            Five practice tools. Same ones we use on real client accounts. You work with real data
            and <b>get scored on the spot</b>, so the pattern is already in your hands when a
            client account is. Here is the loop every module runs.
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
