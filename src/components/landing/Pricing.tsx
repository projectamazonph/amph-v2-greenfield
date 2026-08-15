import { COURSES_URL } from "./constants";
import { CheckIcon } from "./Icons";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Pricing.module.css";

interface Tier {
  flag: string;
  name: string;
  sub: string;
  price: string;
  includes: React.ReactNode[];
  cta: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    flag: "Tier 01",
    name: "PPC Foundations",
    sub: "5 core modules. The full Amazon ads workflow, end to end.",
    price: "2,999",
    includes: [
      <>
        <b>5 modules</b> · ~20 hours of content
      </>,
      <>
        <b>Campaign Builder + Bid Elevator + STR Triage</b> simulators
      </>,
      "Quizzes and badges",
      "Certificate on completion",
      "Community access",
    ],
    cta: "Start Foundations",
  },
  {
    flag: "Tier 02",
    name: "Accelerated Mastery",
    sub: "Everything in Foundations + advanced modules + all simulators.",
    price: "5,999",
    includes: [
      <>
        <b>8 modules</b> · ~40 hours of content
      </>,
      <>
        <b>All 5 simulators</b> (incl. Listing Audit + Keyword Research)
      </>,
      "Scenario packs & downloadable templates",
      "Live class recordings",
      <>
        Certificate with <b>priority review</b>
      </>,
    ],
    cta: "Start Mastery",
    featured: true,
  },
  {
    flag: "Tier 03",
    name: "Ultimate Transformation",
    sub: "Everything in Mastery + weekly live classes with Ryan + 1-on-1 review.",
    price: "9,999",
    includes: [
      <>
        <b>Everything in Mastery</b>
      </>,
      <>
        <b>Weekly live classes</b> with Ryan
      </>,
      <>
        <b>1-on-1 portfolio review</b> (once)
      </>,
      "Private community channel",
      "Direct line to the team for Q&A",
    ],
    cta: "Start Ultimate",
  },
];

export function Pricing() {
  return (
    <section className={shared.sec} id="pricing">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§05 / PRICING</span>
            <h2 className={shared.secTitle}>Three tiers, one-time payment.</h2>
          </div>
          <p className={shared.secLede}>
            Pay once, get the content forever. <b>No subscription, no upsells later.</b> Prices
            below are the documented figures from projectamazonph.vercel.app, identical on every
            surface.
          </p>
        </div>

        <p className={styles.intro}>
          The <b>first module is the same in every tier</b>. The difference is how far you go.
        </p>

        <Reveal className={styles.tiers}>
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={[styles.card, tier.featured ? styles.featured : ""].join(" ")}
            >
              {tier.featured ? (
                <span className={styles.ribbon}>Most students pick this</span>
              ) : null}
              <span className={styles.flag}>{tier.flag}</span>
              <h3>{tier.name}</h3>
              <p className={styles.sub}>{tier.sub}</p>
              <div className={styles.priceLine}>
                <span className={styles.tok}>
                  <span className={styles.cur}>₱</span>
                  {tier.price}
                </span>
                <small>one-time</small>
              </div>
              <p className={styles.payMini}>PayMongo · Card + GCash · receipt emailed</p>
              <ul className={styles.incl}>
                {tier.includes.map((item, i) => (
                  <li key={i}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                className={[shared.btn, tier.featured ? shared.btnPrimary : shared.btnGhost].join(
                  " ",
                )}
                href={COURSES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tier.cta} <span className={shared.arr}>→</span>
              </a>
            </article>
          ))}
        </Reveal>

        <Reveal className={styles.payrail}>
          <div className={styles.payrailLeft}>
            <span className={styles.payrailLabel}>Checkout</span>
            <span className={styles.payChip}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              PayMongo
            </span>
            <span className={styles.payChip}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M6 15h4" />
              </svg>
              Card
            </span>
            <span className={styles.payChip}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2v20M5 7c0 3 3 5 7 5s7-2 7-5M5 17c0-3 3-5 7-5s7 2 7 5" />
              </svg>
              GCash
            </span>
            <span className={styles.payChip}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h16v12H7l-3 3z" />
              </svg>
              Receipt emailed
            </span>
          </div>
          <div>
            <span className={[styles.payChip, styles.guar].join(" ")}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z" />
              </svg>
              7-day refund if &lt; 25% done
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
