/**
 * DashboardHeroStats — small horizontal strip in the dashboard hero
 * header showing a 5-day activity row (5 dots, the most recent 5 days
 * the user earned XP) and the user's lifetime XP total.
 *
 * The component is a pure server component: the dashboard page's data
 * loader computes the totals and passes them as props.
 */

import styles from "./DashboardHeroStats.module.css";

export interface DashboardHeroStatsProps {
  readonly totalXp: number;
  /** Count of distinct, most-recent days the user earned XP on, capped at 5. */
  readonly activeDaysOutOfFive: number;
}

function formatXp(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

export function DashboardHeroStats({ totalXp, activeDaysOutOfFive }: DashboardHeroStatsProps) {
  const safeActive = Math.max(0, Math.min(5, activeDaysOutOfFive));
  const accessibleLabel = `${safeActive} active day${safeActive === 1 ? "" : "s"} out of the last 5`;

  return (
    <div
      className={styles.strip}
      role="group"
      aria-label={accessibleLabel}
      data-testid="dashboard-hero-stats"
    >
      <div className={styles.dots} aria-hidden="true">
        {Array.from({ length: 5 }, (_, idx) => {
          const isFilled = idx < safeActive;
          return (
            <span
              key={idx}
              className={isFilled ? styles.dotFilled : styles.dotEmpty}
              data-day-dot={idx + 1}
              data-day-state={isFilled ? "filled" : "unfilled"}
            />
          );
        })}
      </div>
      <span className={styles.divider} aria-hidden="true" />
      <div className={styles.xp}>
        <svg
          className={styles.xpIcon}
          viewBox="0 0 24 24"
          fill="currentColor"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
        <span className={styles.xpNumber}>{formatXp(totalXp)}</span>
        <span className={styles.xpLabel}>XP</span>
      </div>
    </div>
  );
}

DashboardHeroStats.displayName = "DashboardHeroStats";
