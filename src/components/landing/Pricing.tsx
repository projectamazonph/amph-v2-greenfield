/**
 * Pricing — landing page section 4.
 * Three tiers, one-time payment. Mastery is highlighted.
 */

import styles from "./Pricing.module.css";

interface Tier {
  id: string;
  name: string;
  price: string;
  priceSuffix: string;
  blurb: string;
  features: ReadonlyArray<string>;
  highlighted: boolean;
  cta: string;
  ctaHref: string;
}

const TIERS: ReadonlyArray<Tier> = [
  {
    id: "foundations",
    name: "PPC Foundations",
    price: "₱2,999",
    priceSuffix: "one-time",
    blurb: "5 core modules. The full Amazon ads workflow, end to end.",
    features: [
      "5 modules, ~20 hours of content",
      "Campaign Builder + Bid Elevator + STR Triage simulators",
      "Quizzes and badges",
      "Certificate on completion",
      "Community access",
    ],
    highlighted: false,
    cta: "Start Foundations",
    ctaHref: "/signup?tier=foundations",
  },
  {
    id: "mastery",
    name: "Accelerated Mastery",
    price: "₱5,999",
    priceSuffix: "one-time",
    blurb: "Everything in Foundations + advanced modules + all simulators.",
    features: [
      "8 modules, ~40 hours of content",
      "All 5 simulators (incl. Listing Audit + Keyword Research)",
      "Scenario packs and downloadable templates",
      "Live class recordings",
      "Certificate with priority review",
    ],
    highlighted: true,
    cta: "Start Mastery",
    ctaHref: "/signup?tier=mastery",
  },
  {
    id: "ultimate",
    name: "Ultimate Transformation",
    price: "₱9,999",
    priceSuffix: "one-time",
    blurb: "Everything in Mastery + weekly live classes with Ryan + 1-on-1 review.",
    features: [
      "Everything in Mastery",
      "Weekly live classes with Ryan",
      "1-on-1 portfolio review (once)",
      "Private community channel",
      "Direct line to the team for Q&A",
    ],
    highlighted: false,
    cta: "Start Ultimate",
    ctaHref: "/signup?tier=ultimate",
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className={styles.section}
      aria-labelledby="pricing-heading"
    >
      <div className={styles.inner}>
        <h2 id="pricing-heading" className={styles.heading}>
          Three tiers, one-time payment
        </h2>
        <p className={styles.subhead}>
          Pay once, get the content forever. No subscription, no upsells later.
        </p>
        <ul className={styles.grid}>
          {TIERS.map((tier) => (
            <li
              key={tier.id}
              className={`${styles.card} ${tier.highlighted ? styles.cardHighlighted : ""}`}
            >
              {tier.highlighted ? (
                <span className={styles.ribbon}>Most students pick this</span>
              ) : null}
              <h3 className={styles.tierName}>{tier.name}</h3>
              <div className={styles.priceRow}>
                <span className={styles.price}>{tier.price}</span>
                <span className={styles.priceSuffix}>{tier.priceSuffix}</span>
              </div>
              <p className={styles.blurb}>{tier.blurb}</p>
              <ul className={styles.features}>
                {tier.features.map((f) => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.check} aria-hidden="true">+</span>
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
          Payment via PayMongo. Card and GCash accepted. Receipt emailed.
        </p>
      </div>
    </section>
  );
}
