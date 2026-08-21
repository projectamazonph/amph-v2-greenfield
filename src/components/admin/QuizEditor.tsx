/**
 * QuizEditor — client component for the nested question/option editor.
 *
 * STORY-091 (US-006). Renders a hidden `questionsJson` input alongside
 * the visible editor; the input is owned by this component so the form
 * serializes the current question state on submit. The page passes the
 * input's `name` via the `name` prop (default: "questionsJson").
 *
 * S-1 fix: the previous implementation looked the hidden input up via
 * `document.querySelector` on every keystroke. It now renders the input
 * as a sibling and holds the node in a `useRef`. No DOM lookup, no
 * `typeof document !== "undefined"` guard, no `useEffect` mount seed.
 */
"use client";

import { useRef, useState } from "react";
import styles from "./QuizEditor.module.css";

export interface EditorOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

export interface EditorQuestion {
  id: string;
  questionText: string;
  options: EditorOption[];
}

export interface QuizEditorProps {
  initial: EditorQuestion[];
  /** Hidden input name. Default "questionsJson". */
  name?: string;
}

let counter = 0;
function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

function newQuestion(): EditorQuestion {
  return {
    id: genId("q"),
    questionText: "",
    options: [
      { id: genId("o"), optionText: "", isCorrect: true },
      { id: genId("o"), optionText: "", isCorrect: false },
    ],
  };
}

export function QuizEditor({ initial, name = "questionsJson" }: QuizEditorProps) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Mirror state into the hidden input through the ref. Each call to
  // update() flows setQuestions + syncHiddenInput so the form sees the
  // latest JSON on submit.
  function syncHiddenInput(next: EditorQuestion[]): void {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = JSON.stringify(next);
    }
  }

  function update(next: EditorQuestion[]) {
    setQuestions(next);
    syncHiddenInput(next);
  }

  function addQuestion() {
    update([...questions, newQuestion()]);
  }

  function removeQuestion(qIndex: number) {
    update(questions.filter((_, i) => i !== qIndex));
  }

  function moveQuestion(qIndex: number, delta: -1 | 1) {
    const next = [...questions];
    const target = qIndex + delta;
    if (target < 0 || target >= next.length) return;
    const a = next[qIndex];
    const b = next[target];
    if (!a || !b) return;
    next[qIndex] = b;
    next[target] = a;
    update(next);
  }

  function patchQuestion(qIndex: number, patch: Partial<EditorQuestion>) {
    update(questions.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)));
  }

  function addOption(qIndex: number) {
    const next = questions.map((q, i) =>
      i === qIndex
        ? { ...q, options: [...q.options, { id: genId("o"), optionText: "", isCorrect: false }] }
        : q,
    );
    update(next);
  }

  function removeOption(qIndex: number, oIndex: number) {
    const next = questions.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q,
    );
    update(next);
  }

  function patchOption(qIndex: number, oIndex: number, patch: Partial<EditorOption>) {
    const next = questions.map((q, i) => {
      if (i !== qIndex) return q;
      return {
        ...q,
        options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)),
      };
    });
    update(next);
  }

  function markCorrect(qIndex: number, oIndex: number) {
    // Exactly one correct per question — radio-button semantics.
    const next = questions.map((q, i) => {
      if (i !== qIndex) return q;
      return {
        ...q,
        options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })),
      };
    });
    update(next);
  }

  return (
    <div className={styles.editor}>
      {/* The hidden input is owned by this component. The ref gives
          update() a stable handle without a DOM lookup, and the
          defaultValue seeds the form on first render. The parent page
          no longer needs to render a parallel hidden input. */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={JSON.stringify(initial)}
      />
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Questions ({questions.length})</h3>
        <button type="button" onClick={addQuestion} className={styles.addQuestionButton}>
          + Add question
        </button>
      </div>

      {questions.map((q, qIndex) => (
        <div key={q.id} className={styles.questionCard}>
          <div className={styles.questionRow}>
            {/* M-R29 fix: real <label> instead of `aria-label` overrides. The
                visible "Q{n}" badge stays as a row marker; the sr-only label
                carries the field's accessible name. WCAG 3.3.2 / 4.1.2. */}
            <label htmlFor={`q-${qIndex}-text`} className={styles.questionLabel} aria-hidden>
              Q{qIndex + 1}
            </label>
            <label htmlFor={`q-${qIndex}-text`} className="sr-only">
              Question {qIndex + 1} text
            </label>
            <input
              id={`q-${qIndex}-text`}
              type="text"
              value={q.questionText}
              onChange={(e) => patchQuestion(qIndex, { questionText: e.target.value })}
              placeholder="Question text…"
              required
              className={styles.questionInput}
            />
            <button
              type="button"
              onClick={() => moveQuestion(qIndex, -1)}
              disabled={qIndex === 0}
              aria-label="Move question up"
              className={styles.iconButton}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveQuestion(qIndex, 1)}
              disabled={qIndex === questions.length - 1}
              aria-label="Move question down"
              className={styles.iconButton}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              aria-label="Remove question"
              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
            >
              ✕
            </button>
          </div>

          <div className={styles.optionsStack}>
            {q.options.map((o, oIndex) => (
              <div key={o.id} className={styles.optionRow}>
                <input
                  id={`q-${qIndex}-opt-${oIndex}-correct`}
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={o.isCorrect}
                  onChange={() => markCorrect(qIndex, oIndex)}
                  aria-label={`Mark option ${oIndex + 1} as correct for question ${qIndex + 1}`}
                />
                <input
                  id={`q-${qIndex}-opt-${oIndex}-text`}
                  type="text"
                  value={o.optionText}
                  onChange={(e) => patchOption(qIndex, oIndex, { optionText: e.target.value })}
                  placeholder={`Option ${oIndex + 1} text…`}
                  required
                  className={styles.optionInput}
                />
                {/* M-R29 fix: real <label> for option text input (was
                    `aria-label` override). sr-only so the row layout
                    stays the same. WCAG 3.3.2 / 4.1.2. */}
                <label htmlFor={`q-${qIndex}-opt-${oIndex}-text`} className="sr-only">
                  Option {oIndex + 1} text for question {qIndex + 1}
                </label>
                <button
                  type="button"
                  onClick={() => removeOption(qIndex, oIndex)}
                  disabled={q.options.length <= 2}
                  aria-label={`Remove option ${oIndex + 1} from question ${qIndex + 1}`}
                  className={styles.iconButton}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qIndex)}
              className={styles.addOptionButton}
            >
              + Add option
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
