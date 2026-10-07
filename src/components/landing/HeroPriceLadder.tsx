/**
 * HeroPriceLadder — compact three-tier price strip rendered in the hero,
 * above the fold. The Pricing section already shows the full per-tier
 * includes lists; this strip is the conversion-friendly summary.
 *
 * Prices are sourced from the same constants as the Pricing section
 * (verified against projectamazonph.vercel.app — see docs/audit-…).
 *
 * Server component. Renders an aria-labelled group so screen readers
 * announce the strip once, then read each tier card as a link.
 */

import styles from "./HeroPriceLadder.module.css";

interface HeroTier {
  readonly flag: string;
  readonly name: string;
  readonly price: string;
  readonly featured?: boolean;
}

const HERO_TIERS: readonly HeroTier[] = [
  { flag: "Essentials", name: "PPC Foundations", price: "2,999" },
  { flag: "Pro Operator", name: "Accelerated Mastery", price: "5,999", featured: true },
  { flag: "Elite / Mentored", name: "Ultimate Transformation", price: "9,999" },
];

export function HeroPriceLadder() {
  return (
    <div
      className={styles.ladder}
      role="group"
      aria-label="Three pricing tiers"
      data-testid="hero-price-ladder"
    >
      {HERO_TIERS.map((tier) => (
        <a
          key={tier.name}
          href="#pricing"
          className={[styles.card, tier.featured ? styles.cardFeatured : ""].join(" ")}
          aria-label={`${tier.flag} — ₱${tier.price}, one-time payment`}
        >
          {tier.featured ? (
            <span className={styles.featuredBadge}>Most picked</span>
          ) : null}
          <span className={styles.flag}>{tier.flag}</span>
          <span className={styles.priceLine}>
            <span className={styles.cur}>₱</span>
            {tier.price}
          </span>
        </a>
      ))}
    </div>
  );
}

HeroPriceLadder.displayName = "HeroPriceLadder";