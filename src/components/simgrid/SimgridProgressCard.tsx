/**
 * SimgridProgressCard — Task 9 of the 2026-09-30 SimGrid integration plan.
 *
 * Async server component mounted on /dashboard. Lists every
 * SimGrid simulator alongside the viewer's best score so students
 * see their practice progress without leaving the dashboard.
 *
 * Data flow:
 *   1. `getSessionUserId()` resolves the viewing user from the
 *      session cookie. Returns null for anonymous requests — the
 *      dashboard is auth-gated by src/proxy.ts so a null user only
 *      happens during the test stub where the mock returns "u1".
 *   2. `buildContainer().getBestSimgridScore.execute(...)` reads the
 *      highest-score attempt for that (user, simulator) pair. The
 *      use case returns `Result<SimgridAttempt | null, ...>`, so
 *      `result.ok ? result.value : null` gives us either the best
 *      attempt record or a fallback "no attempts yet" null.
 *   3. Every simulator in `SIMGRID_SIMULATOR_META` gets a row, even
 *      if the user has never practiced it — the row shows "Not
 *      started" rather than hiding the simulator.
 *
 * The 12 simulator lookups run in parallel via `Promise.all` so the
 * dashboard's first paint isn't gated on the slowest row. Best-score
 * lookups are independent reads against the same `simgrid_attempts`
 * table.
 *
 * `<FormativeScoreNotice />` is rendered bare (no `className` prop)
 * per the Task 9 correction — the component's signature does not
 * accept a className, so wrapping it would silently drop the
 * disclaimer styling. The notice keeps the simulator "practice only"
 * framing consistent across every score surface.
 *
 * Styling mirrors the dashboard's My Courses list (same border,
 * radius, row hover treatment) and reuses design tokens from
 * src/app/globals.css — no new tokens introduced.
 */

import Link from "next/link";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { SIMGRID_SIMULATOR_META } from "@/lib/simgrid/manifest";
import { FormativeScoreNotice } from "@/components/tools/FormativeScoreNotice";

import styles from "./SimgridProgressCard.module.css";

export async function SimgridProgressCard() {
  const userId = await getSessionUserId();
  const container = buildContainer();

  const rows = await Promise.all(
    SIMGRID_SIMULATOR_META.map(async (meta) => {
      if (!userId) return { meta, best: null };
      const result = await container.getBestSimgridScore.execute({
        userId,
        simulatorId: meta.id,
      });
      return { meta, best: result.ok ? result.value : null };
    }),
  );

  return (
    <section className={styles.card} aria-labelledby="simgrid-progress-heading">
      <header className={styles.head}>
        <h2 id="simgrid-progress-heading" className={styles.title}>
          SimGrid practice
        </h2>
        <Link href="/practice/simgrid" className={styles.cta}>
          Open SimGrid →
        </Link>
      </header>
      <FormativeScoreNotice />
      <ul className={styles.list}>
        {rows.map(({ meta, best }) => (
          <li key={meta.id} className={styles.row}>
            <Link href={meta.href} className={styles.rowLink}>
              {/* Title is wrapped in an h3 so assistive tech and the
                  regression test can distinguish it from the tag span.
                  For the Capstone simulator (manifest title "Capstone"
                  and tag "Capstone") getByText would otherwise double-
                  match. */}
              <h3 className={styles.rowName}>{meta.title}</h3>
              <span className={styles.rowMeta}>{meta.tag}</span>
              <span
                className={styles.rowScore}
                data-status={best?.passed ? "passed" : best ? "in_progress" : "not_started"}
              >
                {best ? `Best ${best.score}` : "Not started"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
