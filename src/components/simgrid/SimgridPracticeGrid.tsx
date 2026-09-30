/**
 * SimgridPracticeGrid — Task 7 of the 2026-09-30 SimGrid integration plan.
 *
 * Server component. Renders the 12-card grid for /practice/simgrid,
 * sourced from SIMGRID_SIMULATOR_META so the allowlist in
 * @/domain/simgrid stays the single source of truth for simulator ids.
 *
 * Each card is a single <Link> wrapping the simulator's title, tag,
 * and description. The CTA text reads "Open simulator" so every link
 * shares the same accessible-name pattern (the test asserts on it via
 * a regex match). The href is /practice/simgrid/<file>.html — the
 * AMPH wrapper route mounts the vendored HTML iframe at that path.
 *
 * Styling mirrors src/app/tools/page.module.css (same card surface,
 * border, radius, hover/focus treatment) and reuses design tokens from
 * src/app/globals.css — no new tokens introduced.
 */

import Link from "next/link";

import { SIMGRID_SIMULATOR_META } from "@/lib/simgrid/manifest";
import styles from "./SimgridPracticeGrid.module.css";

export function SimgridPracticeGrid() {
  return (
    <ul className={styles.grid} aria-label="SimGrid simulators">
      {SIMGRID_SIMULATOR_META.map((entry) => (
        <li key={entry.id} className={styles.card}>
          <Link href={entry.href} className={styles.cardLink}>
            <span className={styles.tag} aria-hidden="true">
              {entry.tag}
            </span>
            <h2 className={styles.cardName}>{entry.title}</h2>
            <p className={styles.cardDescription}>{entry.description}</p>
            <span className={styles.cardCta}>
              Open simulator
              <span className={styles.cardCtaArrow} aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
