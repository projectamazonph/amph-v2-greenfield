/**
 * QuizPlayer — client component.
 *
 * Walks through the quiz questions one at a time. Picks an
 * option, clicks Submit, then advances. On the last question,
 * POST to /api/quizzes/[quizId]/attempt with all the answers
 * through the authenticated Server Action and shows the score + pass/fail.
 */

"use client";

import { useState, useTransition } from "react";
import { submitQuizAttemptAction } from "@/app/actions/submitQuizAttempt.action";
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

interface ReviewItem {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
}

interface SubmitResult {
  ok: boolean;
  score?: number | null;
  passed?: boolean | null;
  correctCount?: number | null;
  totalQuestions?: number | null;
  xpAwarded?: number | null;
  review?: readonly ReviewItem[] | null;
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
          const response = await submitQuizAttemptAction({
            quizId,
            answers: questions.map((question) => ({
              questionId: question.id,
              selectedOptionId: answers[question.id] ?? "",
            })),
          });
          if (response.ok) {
            setResult(response);
            setSubmitted(true);
          } else {
            setResult({ ok: false, error: quizErrorMessage(response.error) });
          }
        } catch {
          setResult({
            ok: false,
            error: "We could not submit your quiz. Please try again.",
          });
        }
      });
    }
  };

  if (submitted && result?.ok) {
    const passed = result.passed ?? false;
    const questionById = new Map(questions.map((q) => [q.id, q]));
    return (
      <>
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
            {result.correctCount} of {result.totalQuestions} correct. Passing score: {passingScore}
            %.
          </p>
          {passed && result.xpAwarded ? (
            <p className={styles.xpLine}>+{result.xpAwarded} XP awarded</p>
          ) : null}
          <a href="/dashboard" className={styles.backLink}>
            Back to dashboard
          </a>
        </div>
        {result.review && result.review.length > 0 ? (
          <div className={styles.review}>
            <h3 className={styles.reviewHeading}>Answer review</h3>
            {result.review.map((item) => {
              const question = questionById.get(item.questionId);
              if (!question) return null;
              const isCorrect = item.selectedOptionId === item.correctOptionId;
              const optionById = new Map(question.options.map((o) => [o.id, o]));
              const selectedText = optionById.get(item.selectedOptionId)?.optionText ?? "";
              const correctText = optionById.get(item.correctOptionId)?.optionText ?? "";
              return (
                <div key={item.questionId} className={styles.reviewItem} data-correct={isCorrect}>
                  <p className={styles.reviewQuestion}>{question.questionText}</p>
                  <p className={styles.reviewAnswer}>
                    Your answer: <strong>{selectedText}</strong>
                  </p>
                  {!isCorrect ? (
                    <p className={styles.reviewAnswer}>
                      Correct answer: <strong>{correctText}</strong>
                    </p>
                  ) : null}
                  {item.explanation ? (
                    <p className={styles.reviewExplanation}>{item.explanation}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </>
    );
  }

  if (!current) {
    return <p>No questions in this quiz.</p>;
  }

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <span className={styles.kicker}>Quick check</span>
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
      {result && !result.ok ? (
        <p className={styles.error} role="alert">
          {result.error}
        </p>
      ) : null}
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

function quizErrorMessage(error: string): string {
  switch (error) {
    case "not_authenticated":
      return "Your session expired. Sign in again before submitting.";
    case "access_denied":
      return "Course access is required to submit this quiz.";
    case "quiz_not_found":
      return "This quiz is no longer available.";
    case "invalid_submission":
    case "invalid_answer":
      return "One or more answers are invalid. Reload the page and try again.";
    default:
      return "We could not submit your quiz. Please try again.";
  }
}
