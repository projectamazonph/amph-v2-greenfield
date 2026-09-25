/**
 * /pricing — public pricing page.
 *
 * Fetches ACTIVE pricing tiers from the database and renders tier cards.
 * Decision 6 (2026-09-24): early-bird is dropped, so each tier shows
 * exactly one price.
 *
 * STORY-015.
 */

import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
import { StudentShell } from "@/components/student/StudentShell";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Pricing | Project Amazon PH Academy",
  description:
    "Three one-time payment tiers for Amazon PPC training. Pay once, get lifetime access. No subscription, no upsells.",
};

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const container = buildContainer();
  const useCase = new ListPricingTiers({ pricingTierRepo: container.pricingTierRepo });

  const result = await useCase.execute();

  const loadError = result.ok
    ? null
    : "We couldn't load pricing right now. Course access is unchanged. Refresh in a moment and try again.";
  const tiers = result.ok ? result.value.tiers : [];

  return (
    <StudentShell requireAuth={false}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Pricing</span>
          <h1 className={styles.title}>Three tiers, one-time payment.</h1>
          <p className={styles.subhead}>
            Pay once, get the content forever. No subscription, no upsells later.
          </p>
        </header>

        {loadError ? (
          <p className={styles.error} role="alert">
            {loadError}
          </p>
        ) : tiers.length === 0 ? (
          <p className={styles.note}>No active pricing plans are published yet. Check back soon.</p>
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

                <h2 className={styles.tierName}>{tier.name}</h2>

                <div className={styles.priceRow}>
                  <span className={styles.price}>{tier.displayPrice.format()}</span>
                  <span className={styles.priceSuffix}>one-time</span>
                </div>

                {tier.courseSlug ? (
                  <a
                    href={`/signup?tier=${tier.slug}`}
                    className={`${styles.cta} ${tier.slug === "mastery" ? styles.ctaPrimary : styles.ctaSecondary}`}
                  >
                    Enroll in {tier.name}
                  </a>
                ) : (
                  <span className={`${styles.cta} ${styles.ctaSecondary}`} aria-disabled="true">
                    Not currently available
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className={styles.note}>
          Payment via PayMongo. Card and GCash accepted. 7-day money-back guarantee on less than 25%
          course completion.
        </p>
      </main>
    </StudentShell>
  );
}
