"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./ToolDebrief.module.css";

export interface ToolDebriefProps {
  readonly simulatorId: string;
  readonly scoreLabel: string;
  readonly whyItMatters: string;
  readonly lessonHref: string;
  readonly lessonLabel: string;
  readonly retryHref: string;
  readonly rationalePrompt: string;
}

/**
 * ToolDebrief — post-attempt debrief pattern (LEARN-032).
 *
 * Five sections, always in this order:
 * 1. Result summary (plain language, never a certification claim).
 * 2. Why it matters (one paragraph tying the score to client work).
 * 3. Targeted lesson revisit (link; the learner keeps the attempt record).
 * 4. Retry (link to a fresh attempt; the completed record is untouched).
 * 5. Rationale prompt (labelled textarea; the learner states the
 *    reason in their own words. Autosave to an artefact is LEARN-034).
 */
export function ToolDebrief({
  simulatorId,
  scoreLabel,
  whyItMatters,
  lessonHref,
  lessonLabel,
  retryHref,
  rationalePrompt,
}: ToolDebriefProps) {
  const [rationale, setRationale] = useState("");
  const textareaId = `debrief-rationale-${simulatorId}`;

  return (
    <section className={styles.debrief} aria-labelledby={`debrief-heading-${simulatorId}`}>
      <h3 id={`debrief-heading-${simulatorId}`} className={styles.heading}>
        What to do next
      </h3>

      <div className={styles.block}>
        <h4 className={styles.blockHeading}>Your result</h4>
        <p className={styles.body}>{scoreLabel}</p>
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockHeading}>Why it matters</h4>
        <p className={styles.body}>{whyItMatters}</p>
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockHeading}>Revisit the lesson</h4>
        <p className={styles.body}>
          <Link href={lessonHref} className={styles.link}>
            {lessonLabel}
          </Link>
        </p>
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockHeading}>Try again</h4>
        <p className={styles.body}>
          <Link href={retryHref} className={styles.link}>
            Run another attempt
          </Link>{" "}
          Your completed attempt above stays on record.
        </p>
      </div>

      <div className={styles.block}>
        <label htmlFor={textareaId} className={styles.blockHeading}>
          State your rationale
        </label>
        <p className={styles.body}>{rationalePrompt}</p>
        <textarea
          id={textareaId}
          className={styles.textarea}
          rows={4}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Write the reason in plain client language."
        />
      </div>
    </section>
  );
}
