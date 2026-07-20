/**
 * QuizPlayer — client component.
 *
 * Walks through the quiz questions one at a time. Picks an
 * option, clicks Submit, then advances. On the last question,
 * POST to /api/quizzes/[quizId]/attempt with all the answers
 * and shows the score + pass/fail.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./QuizPlayer.module.css";

interface Option {
  id: string;
  optionText: string;
}
interface Question {
  id: string;
  questionText: string;
  options: ReadonlyArray<Option>;
}
interface Props {
  quizId: string;
  title: string;
  passingScore: number;
  questions: ReadonlyArray<Question>;
}

interface SubmitResult {
  ok: boolean;
  score?: number;
  passed?: boolean;
  correctCount?: number;
  totalCount?: number;
  xpAwarded?: number;
  error?: string;
}

export function QuizPlayer({ quizId, title, passingScore, questions }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const totalCount = questions.length;

  const onChoose = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const onAdvance = () => {
    if (!isLast) {
      setStep((s) => s + 1);
    } else {
      // Submit
      startTransition(async () => {
        try {
          const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: questions.map((q) => ({
                questionId: q.id,
                selectedOptionId: answers[q.id],
              })),
            }),
          });
          const body = (await res.json()) as SubmitResult;
          if (res.ok) {
            setResult({ ...body, ok: true });
            setSubmitted(true);
          } else {
            setResult({ ok: false, error: body.error ?? "Submission failed" });
          }
        } catch (e) {
          setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      });
    }
  };

  if (submitted && result?.ok) {
    const passed = result.passed ?? false;
    return (
      <div className={styles.resultPanel}>
        <h2 className={styles.resultTitle}>{passed ? "You passed" : "You did not pass"}</h2>
        <div
          className={styles.resultScore}
          style={{
            color: passed ? "var(--success)" : "var(--danger)",
          }}
        >
          {result.score ?? 0}%
        </div>
        <p className={styles.resultDetail}>
          {result.correctCount} of {result.totalCount} correct. Passing score: {passingScore}%.
        </p>
        {passed && result.xpAwarded ? (
          <p className={styles.xpLine}>+{result.xpAwarded} XP awarded</p>
        ) : null}
        <a href="/dashboard" className={styles.backLink}>
          Back to dashboard
        </a>
      </div>
    );
  }

  if (!current) {
    return <p>No questions in this quiz.</p>;
  }

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <span className={styles.kicker}>Knowledge check</span>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.progressRow}>
          <span className={styles.progress}>
            Question {step + 1} of {totalCount}
          </span>
          <span className={styles.passMark}>Pass ≥ {passingScore}%</span>
        </div>
      </header>
      <div className={styles.question}>
        <p className={styles.questionText}>{current.questionText}</p>
        <div className={styles.options}>
          {current.options.map((opt) => {
            const selected = answers[current.id] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
                onClick={() => onChoose(current.id, opt.id)}
              >
                <span className={styles.optionDot} />
                <span>{opt.optionText}</span>
              </button>
            );
          })}
        </div>
      </div>
      {result && !result.ok ? <p className={styles.error}>{result.error}</p> : null}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.submit}
          onClick={onAdvance}
          disabled={!answers[current.id] || pending}
        >
          {pending ? "Submitting…" : isLast ? "Submit answer" : "Next question"}
        </button>
      </div>
    </div>
  );
}
