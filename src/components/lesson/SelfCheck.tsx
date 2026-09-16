// src/components/lesson/SelfCheck.tsx
"use client";

/**
 * SelfCheck - short, in-line "check your understanding" question.
 *
 * Client component. State is session-only; selection is NOT persisted
 * (no localStorage, no DB). On submit, the user sees whether they picked
 * the right answer along with the explanation. No grading, no XP, no analytics.
 */

import { useId, useState, type FormEvent, type ReactElement } from "react";
import { CheckCircle, XCircle, ArrowClockwise } from "@phosphor-icons/react";
import styles from "./SelfCheck.module.css";

export interface SelfCheckProps {
  id: string;
  prompt: string;
  options: readonly string[];
  answerIndex: number;
  explanation: string;
  revealLabel?: string;
  retryLabel?: string;
  /**
   * Stable lesson identifier for LEARN-040 tracking. When present,
   * the component fires a best-effort record call on submit; a
   * failed write never blocks the explanation. Absent = session-only
   * (the pre-LEARN-040 behaviour).
   */
  lessonSlug?: string;
}

type FeedbackState = "idle" | "correct" | "incorrect";

export function SelfCheck(props: SelfCheckProps): ReactElement {
  const {
    id,
    prompt,
    options,
    answerIndex,
    explanation,
    revealLabel = "Check answer",
    retryLabel = "Try again",
    lessonSlug,
  } = props;
  const baseId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");

  const inputName = `${baseId}-${id}`;

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selected === null) return;
    const correct = selected === answerIndex;
    setFeedback(correct ? "correct" : "incorrect");
    if (lessonSlug !== undefined) {
      // Best-effort LEARN-040 tracking: never block the explanation.
      void recordAttempt(lessonSlug, id, correct);
    }
  }

  /**
   * Fire-and-forget record call. Imported lazily so the component
   * stays renderable without the server-action module in unit tests.
   */
  async function recordAttempt(slug: string, checkId: string, correct: boolean): Promise<void> {
    try {
      const { recordRetrievalCheckAction } =
        await import("@/app/actions/recordRetrievalCheck.action");
      await recordRetrievalCheckAction({ lessonSlug: slug, checkId, correct });
    } catch {
      // Swallowed by design: a failed write must not change what the
      // learner sees. The attempt is session-visible regardless.
      if (process.env.NODE_ENV === "development") {
        console.debug("[SelfCheck] retrieval record failed; continuing.");
      }
    }
  }

  function onReset(): void {
    setSelected(null);
    setFeedback("idle");
  }

  return (
    <section
      id={id}
      className={`${styles.selfCheck} ${feedback !== "idle" ? styles[feedback] : ""}`}
      aria-labelledby={`${id}-prompt`}
    >
      <form onSubmit={onSubmit}>
        <h3 id={`${id}-prompt`} className={styles.prompt}>
          {prompt}
        </h3>
        <fieldset className={styles.fieldset}>
          <legend className={styles.visuallyHidden}>Answer choices</legend>
          {options.map((option, index) => (
            <label key={`${id}-${index}`} className={styles.option}>
              <input
                type="radio"
                name={inputName}
                value={index}
                checked={selected === index}
                onChange={() => {
                  setSelected(index);
                  if (feedback !== "idle") setFeedback("idle");
                }}
                disabled={feedback === "correct"}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        <div className={styles.actions}>
          {feedback === "idle" ? (
            <button type="submit" className={styles.submit} disabled={selected === null}>
              {revealLabel}
            </button>
          ) : (
            <button type="button" className={styles.reset} onClick={onReset}>
              <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
        </div>
        {feedback === "correct" ? (
          <p className={styles.feedback} role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            <span>Correct. {explanation}</span>
          </p>
        ) : null}
        {feedback === "incorrect" ? (
          <p className={styles.feedback} role="status">
            <XCircle size={18} weight="fill" aria-hidden="true" />
            <span>Not quite. {explanation}</span>
          </p>
        ) : null}
      </form>
    </section>
  );
}
