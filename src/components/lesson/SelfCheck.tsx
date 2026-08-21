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
  } = props;
  const baseId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");

  const inputName = `${baseId}-${id}`;

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selected === null) return;
    setFeedback(selected === answerIndex ? "correct" : "incorrect");
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
