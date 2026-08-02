/**
 * FormativeScoreNotice — STORY-078.
 *
 * AGENTS.md's simulator rule: "Simulator scores are formative. Never
 * label them 'certified' or 'hiring ready' in copy." This is the one
 * shared component every simulator's result view renders next to its
 * score, so the disclaimer can't quietly drop off one simulator while
 * staying on the others. Plain function component (no hooks, no
 * "use client") so it works unchanged in both the server-rendered
 * BidElevatorResult and the client-rendered forms for the other four
 * simulators.
 */

import styles from "./FormativeScoreNotice.module.css";

export function FormativeScoreNotice() {
  return (
    <p className={styles.notice}>
      Practice score only. Not a certification, job-readiness signal, or hiring credential.
    </p>
  );
}
