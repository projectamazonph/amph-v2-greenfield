/**
 * /pricing — public pricing page.
 *
 * Read-only marketing page with the 3 tiers and a comparison
 * table. Mirrors the landing-page pricing card style; no use case
 * or DI needed.
 */

import styles from "./page.module.css";

export const dynamic = "force-static";

interface Tier {
  id: string;
  name: string;
  price: string;
  blurb: string;
  features: ReadonlyArray<string>;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}

const TIERS: ReadonlyArray<Tier> = [
  {
    id: "foundations",
    name: "PPC Foundations",
    price: "₱2,999",
    blurb: "5 core modules. The full Amazon ads workflow, end to end.",
    features: [
      "5 modules, ~20 hours of content",
      "Campaign Builder, Bid Elevator, STR Triage simulators",
      "Quizzes and badges",
      "Certificate on completion",
      "Community access",
    ],
    cta: "Start Foundations",
    ctaHref: "/signup?tier=foundations",
    highlighted: false,
  },
  {
    id: "mastery",
    name: "Accelerated Mastery",
    price: "₱5,999",
    blurb: "Everything in Foundations + advanced modules + all simulators.",
    features: [
      "8 modules, ~40 hours of content",
      "All 5 simulators (incl. Listing Audit + Keyword Research)",
      "Scenario packs and downloadable templates",
      "Live class recordings",
      "Certificate with priority review",
    ],
    cta: "Start Mastery",
    ctaHref: "/signup?tier=mastery",
    highlighted: true,
  },
  {
    id: "ultimate",
    name: "Ultimate Transformation",
    price: "₱9,999",
    blurb: "Everything in Mastery + weekly live classes with Ryan + 1-on-1 review.",
    features: [
      "Everything in Mastery",
      "Weekly live classes with Ryan",
      "1-on-1 portfolio review (once)",
      "Private community channel",
      "Direct line to the team for Q&A",
    ],
    cta: "Start Ultimate",
    ctaHref: "/signup?tier=ultimate",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1 className={styles.title}>Three tiers, one-time payment.</h1>
        <p className={styles.subhead}>
          Pay once, get the content forever. No subscription, no upsells later.
        </p>
      </header>
      <ul className={styles.grid}>
        {TIERS.map((tier) => (
          <li
            key={tier.id}
            className={`${styles.card} ${tier.highlighted ? styles.cardHighlighted : ""}`}
          >
            {tier.highlighted ? (
              <span className={styles.ribbon}>Most students pick this</span>
            ) : null}
            <h2 className={styles.tierName}>{tier.name}</h2>
            <div className={styles.priceRow}>
              <span className={styles.price}>{tier.price}</span>
              <span className={styles.priceSuffix}>one-time</span>
            </div>
            <p className={styles.blurb}>{tier.blurb}</p>
            <ul className={styles.features}>
              {tier.features.map((f) => (
                <li key={f} className={styles.feature}>
                  <span className={styles.plus} aria-hidden="true">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href={tier.ctaHref}
              className={`${styles.cta} ${tier.highlighted ? styles.ctaPrimary : styles.ctaSecondary}`}
            >
              {tier.cta}
            </a>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Payment via PayMongo. Card and GCash accepted. 7-day money-back
        guarantee on less than 25% course completion.
      </p>
    </main>
  );
}
