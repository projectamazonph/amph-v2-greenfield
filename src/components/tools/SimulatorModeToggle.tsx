/**
 * SimulatorModeToggle — STORY-088.
 *
 * Lets a student pick Practice or Challenge mode before running a
 * simulator. Challenge is disabled until `unlocked` is true — a student
 * unlocks it by passing that simulator at least once in Practice mode
 * (checked server-side by CheckChallengeModeUnlocked). Passing a
 * Challenge-mode attempt awards a one-time-per-attempt XP bonus
 * (XPService.SIMULATOR_CHALLENGE_PASSED_XP); there is no difficulty-tier
 * unlock chain, badge, or leaderboard here — deliberately out of scope.
 */

"use client";

import styles from "./SimulatorModeToggle.module.css";

export type PracticeOrChallengeMode = "practice" | "challenge";

interface Props {
  mode: PracticeOrChallengeMode;
  onChange: (mode: PracticeOrChallengeMode) => void;
  unlocked: boolean;
  disabled?: boolean;
}

export function SimulatorModeToggle({ mode, onChange, unlocked, disabled = false }: Props) {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Simulator mode">
      <button
        type="button"
        role="radio"
        aria-checked={mode === "practice"}
        className={styles.option}
        data-active={mode === "practice"}
        disabled={disabled}
        onClick={() => onChange("practice")}
      >
        Practice
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "challenge"}
        className={styles.option}
        data-active={mode === "challenge"}
        disabled={disabled || !unlocked}
        title={unlocked ? undefined : "Pass this simulator in Practice mode to unlock Challenge"}
        onClick={() => onChange("challenge")}
      >
        Challenge {unlocked ? null : <span className={styles.lock}>🔒</span>}
      </button>
      {mode === "challenge" ? (
        <span className={styles.hint}>Challenge mode: passing awards a one-time bonus XP.</span>
      ) : null}
    </div>
  );
}
