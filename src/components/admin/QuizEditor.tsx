/**
 * QuizEditor — client component for the nested question/option editor.
 *
 * STORY-091 (US-006). Serializes the questions array to a hidden
 * `questionsJson` field on submit so the server action can consume
 * a single FormData. The page is responsible for naming the hidden
 * input via the `name` prop (default: "questionsJson").
 */
"use client";

import { useState } from "react";

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

  function update(next: EditorQuestion[]) {
    setQuestions(next);
    // Keep the hidden input in sync so server actions can read it.
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (input) input.value = JSON.stringify(next);
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

  // Initialize the hidden input on first render.
  if (typeof document !== "undefined") {
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (input && !input.value) {
      input.value = JSON.stringify(questions);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--ink-800)" }}>
          Questions ({questions.length})
        </h3>
        <button
          type="button"
          onClick={addQuestion}
          style={{
            padding: "0.375rem 0.75rem",
            background: "var(--surface-2, #f4f4f5)",
            color: "var(--ink-800)",
            border: "1px solid var(--border, #d4d4d8)",
            borderRadius: "0.375rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add question
        </button>
      </div>

      {questions.map((q, qIndex) => (
        <div
          key={q.id}
          style={{
            border: "1px solid var(--border, #e4e4e7)",
            borderRadius: "0.5rem",
            padding: "1rem",
            background: "var(--surface-2, #fafafa)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "var(--ink-700)" }}>Q{qIndex + 1}</span>
            <input
              type="text"
              value={q.questionText}
              onChange={(e) => patchQuestion(qIndex, { questionText: e.target.value })}
              placeholder="Question text…"
              required
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: "1px solid var(--border, #d4d4d8)",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                background: "white",
              }}
            />
            <button
              type="button"
              onClick={() => moveQuestion(qIndex, -1)}
              disabled={qIndex === 0}
              aria-label="Move question up"
              style={iconButtonStyle(qIndex === 0)}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveQuestion(qIndex, 1)}
              disabled={qIndex === questions.length - 1}
              aria-label="Move question down"
              style={iconButtonStyle(qIndex === questions.length - 1)}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              aria-label="Remove question"
              style={{ ...iconButtonStyle(false), color: "var(--danger)" }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              paddingLeft: "1.5rem",
            }}
          >
            {q.options.map((o, oIndex) => (
              <div key={o.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={o.isCorrect}
                  onChange={() => markCorrect(qIndex, oIndex)}
                  aria-label="Mark as correct answer"
                />
                <input
                  type="text"
                  value={o.optionText}
                  onChange={(e) => patchOption(qIndex, oIndex, { optionText: e.target.value })}
                  placeholder={`Option ${oIndex + 1} text…`}
                  required
                  style={{
                    flex: 1,
                    padding: "0.375rem 0.625rem",
                    border: "1px solid var(--border, #d4d4d8)",
                    borderRadius: "0.375rem",
                    fontSize: "0.8125rem",
                    background: "white",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeOption(qIndex, oIndex)}
                  disabled={q.options.length <= 2}
                  aria-label="Remove option"
                  style={iconButtonStyle(q.options.length <= 2)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qIndex)}
              style={{
                alignSelf: "flex-start",
                padding: "0.25rem 0.625rem",
                background: "transparent",
                color: "var(--brand)",
                border: "1px dashed var(--brand)",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "0.25rem",
              }}
            >
              + Add option
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function iconButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "1.75rem",
    height: "1.75rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    color: "var(--ink-700)",
    border: "1px solid var(--border, #d4d4d8)",
    borderRadius: "0.25rem",
    fontSize: "0.875rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}
