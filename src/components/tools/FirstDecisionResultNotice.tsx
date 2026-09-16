"use client";

import Link from "next/link";
import styles from "./FirstDecisionResultNotice.module.css";

interface FirstDecisionResultNoticeProps {
  readonly visible: boolean;
}

/**
 * Inline reminder shown at the top of the Bid Elevator tool when the
 * learner arrives from the LEARN-014 onboarding route. The notice
 * reminds them to read the result explanation back on
 * `/dashboard/first-decision` once they have submitted their decision.
 *
 * The component is a pure client island; the parent server component
 * decides whether to render it based on the `from=first-decision`
 * query string.
 */
export function FirstDecisionResultNotice({ visible }: FirstDecisionResultNoticeProps) {
  if (!visible) return null;

  return (
    <aside className={styles.notice} role="status">
      <p>
        You came here from the onboarding first-decision brief. Make the bid changes using the rule
        you just read, then{" "}
        <Link href="/dashboard/first-decision" className={styles.link}>
          return to the brief
        </Link>{" "}
        to read the result explanation.
      </p>
    </aside>
  );
}
