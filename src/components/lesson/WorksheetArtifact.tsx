// src/components/lesson/WorksheetArtifact.tsx
"use client";

/**
 * WorksheetArtifact — STORY-163 client component for the Module 1
 * Profitability and Max-CPC Sheet.
 *
 * Hydrates the rendered `:::worksheet{...}` directive. Local state
 * holds one entry per field; the full row is saved to the server on
 * blur via saveWorksheetEntryAction (lazy-imported so tests can
 * vi.mock("@/app/actions/worksheet.action") without the module
 * pulling in next/cache).
 *
 * One fetch on mount (parent server component passes initialValues
 * from GetWorksheetUseCase). Zero round-trips while typing; one save
 * on blur. Save failures are surfaced as a non-blocking indicator
 * so they can keep typing without losing their work.
 */

import { useState, type FocusEvent, type ReactElement } from "react";
import styles from "./WorksheetArtifact.module.css";

export type WorksheetFieldDescriptor = Readonly<{
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
}>;

export interface WorksheetArtifactProps {
  studentId: string;
  lessonSlug: string;
  partNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  fields: readonly WorksheetFieldDescriptor[];
  initialValues: Readonly<Record<string, string>>;
  /** Optional override; defaults to "Save" / "Saving…" / "Saved at HH:MM:SS" indicator. */
  labels?: Partial<{
    savePending: string;
    saveSaved: (at: string) => string;
    saveIdle: string;
  }>;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

function formatTime(at: Date): string {
  return at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function WorksheetArtifact(props: WorksheetArtifactProps): ReactElement {
  const { studentId, lessonSlug, partNumber, title, fields, initialValues } = props;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of fields) out[f.key] = initialValues[f.key] ?? "";
    return out;
  });
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  async function save(): Promise<void> {
    setSaveState({ kind: "saving" });
    try {
      const { saveWorksheetEntryAction } = await import("@/app/actions/worksheet.action");
      const result = await saveWorksheetEntryAction({ studentId, lessonSlug, values });
      if (result.ok) {
        setSaveState({ kind: "saved", at: new Date(result.value.savedAt) });
      } else {
        setSaveState({
          kind: "error",
          message: describeError(result.error.kind),
        });
      }
    } catch (err) {
      setSaveState({ kind: "error", message: String(err) });
    }
  }

  return (
    <form
      data-amph-block="worksheet"
      data-amph-lesson={lessonSlug}
      data-amph-part={partNumber}
      aria-label={title}
      className={styles.worksheet}
      onBlur={(event: FocusEvent<HTMLFormElement>) => {
        // Only fire save when focus actually leaves the form (not when
        // it moves between two inputs inside the same form).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          void save();
        }
      }}
    >
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.partLabel}>Part {partNumber} of your Profitability and Max-CPC Sheet</p>
      <div className={styles.fields}>
        {fields.map((f) => (
          <label key={f.key} className={styles.field}>
            <span className={styles.label}>{f.label}</span>
            <input
              type="text"
              className={styles.input}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
            {f.hint !== undefined && f.hint !== "" && <span className={styles.hint}>{f.hint}</span>}
          </label>
        ))}
      </div>
      <p className={styles.status} aria-live="polite" role="status">
        {renderStatus(saveState, props.labels)}
      </p>
    </form>
  );
}

function renderStatus(state: SaveState, labels: WorksheetArtifactProps["labels"]): string {
  const idle = labels?.saveIdle ?? "Not saved yet";
  const pending = labels?.savePending ?? "Saving…";
  const savedAt = labels?.saveSaved ?? ((at: string) => `Saved at ${at}`);
  switch (state.kind) {
    case "idle":
      return idle;
    case "saving":
      return pending;
    case "saved":
      return savedAt(formatTime(state.at));
    case "error":
      return state.message;
  }
}

function describeError(kind: string): string {
  switch (kind) {
    case "unauthorized":
      return "Sign in to save your sheet.";
    case "forbidden":
      return "You can only edit your own sheet.";
    case "invalid_lesson":
      return "This lesson is not part of the Module 1 sheet.";
    case "invalid_field":
      return "One or more fields are not part of this lesson. Refreshing will fix it.";
    default:
      return "Could not save right now. Try again.";
  }
}
