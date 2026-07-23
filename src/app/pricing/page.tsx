/**
 * /pricing — public pricing page.
 *
 * Fetches ACTIVE pricing tiers from the database and renders tier cards.
 * Early-bird pricing is resolved server-side so the correct price and
 * countdown timer are visible on first render.
 *
 * STORY-015.
 */

import { buildContainer } from "@/composition/container";
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
import styles from "./page.module.css";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format minutes as "X days Y hrs Z min" or just "X min" if < 60 min. */
function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / 1440);
  const hrs = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return `${days}d ${hrs}h ${mins}m`;
  }
  return `${hrs}h ${mins}m`;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const container = buildContainer();
  const useCase = new ListPricingTiers({ pricingTierRepo: container.pricingTierRepo });

  const result = await useCase.execute();

  // If DB is unavailable, render a graceful fallback (no crash).
  // This keeps the page SSR-safe even before migrations are applied.
  const tiers = result.ok ? result.value.tiers : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1 className={styles.title}>Three tiers, one-time payment.</h1>
        <p className={styles.subhead}>
          Pay once, get the content forever. No subscription, no upsells later.
        </p>
      </header>

      {tiers.length === 0 ? (
        <p className={styles.note}>Pricing tiers coming soon.</p>
      ) : (
        <ul className={styles.grid}>
          {tiers.map((tier) => (
            <li
              key={tier.id}
              className={`${styles.card} ${tier.slug === "mastery" ? styles.cardHighlighted : ""}`}
            >
              {tier.slug === "mastery" ? (
                <span className={styles.ribbon}>Most students pick this</span>
              ) : null}

              {/* Early-bird badge */}
              {tier.isEarlyBird && (
                <span className={styles.earlyBirdBadge}>
                  Early Bird · {formatCountdown(tier.earlyBirdMinutesRemaining)} left
                </span>
              )}

              <h2 className={styles.tierName}>{tier.name}</h2>

              <div className={styles.priceRow}>
                {tier.isEarlyBird && tier.originalPrice ? (
                  <>
                    <span className={styles.price}>{tier.displayPrice.format()}</span>
                    <span className={styles.originalPrice}>{tier.originalPrice.format()}</span>
                  </>
                ) : (
                  <span className={styles.price}>{tier.displayPrice.format()}</span>
                )}
                <span className={styles.priceSuffix}>one-time</span>
              </div>

              {/* Countdown timer for early-bird tiers */}
              {tier.isEarlyBird && tier.earlyBirdMinutesRemaining > 0 && (
                <p className={styles.countdown}>
                  Early-bird ends in{" "}
                  <strong>{formatCountdown(tier.earlyBirdMinutesRemaining)}</strong>
                </p>
              )}

              <a
                href={`/signup?tier=${tier.slug}`}
                className={`${styles.cta} ${tier.slug === "mastery" ? styles.ctaPrimary : styles.ctaSecondary}`}
              >
                Enroll in {tier.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.note}>
        Payment via PayMongo. Card and GCash accepted. 7-day money-back guarantee on less than 25%
        course completion.
      </p>
    </main>
  );
}
