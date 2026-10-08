"use client";

/**
 * WorksheetEntry — per-H2 worksheet artifact.
 *
 * Hydrates the :::worksheet{id="..." title="..." lesson="..."} directive
 * with one labeled input per field. State is local; the full H2 is
 * saved via saveWorksheetEntryAction on form-blur (not while typing).
 * Intra-form blurs do not trigger a save; only focus leaving the form
 * does.
 *
 * Initial values are pre-populated from a server-side fetch (the route
 * layer calls GetWorksheet before rendering the lesson). When the
 * student has not saved anything for this H2 yet, every field starts
 * empty.
 *
 * Read-only (guest) viewers see the inputs but the form does not save;
 * a small banner explains why. The route layer passes an
 * `interactive` flag to control this.
 */

import { useCallback, useMemo, useState, type ReactElement } from "react";
import { FloppyDisk, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import styles from "./WorksheetEntry.module.css";

export interface WorksheetFieldSpec {
  /** kebab-case key used as the persistence fieldKey. */
  key: string;
  /** Short label rendered above the input. */
  label: string;
  /** Optional placeholder text inside the input. */
  placeholder?: string;
}

export interface WorksheetEntryProps {
  /** Stable id from the directive. */
  id: string;
  /** Lesson slug this H2 lives in (from the route). */
  lessonSlug: string;
  /** H2 anchor this entry writes. */
  h2Anchor: string;
  /** H2 title rendered as the artifact eyebrow. */
  title: string;
  /** Field definitions (key + label + placeholder). */
  fields: readonly WorksheetFieldSpec[];
  /** Server-side pre-populated values. Defaults to empty for every field. */
  initialValues?: Readonly<Record<string, string>>;
  /** When false, the form is rendered read-only with a banner. */
  interactive?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function rowKey(values: Readonly<Record<string, string>>): string {
  return JSON.stringify(values);
}

export function WorksheetEntry(props: WorksheetEntryProps): ReactElement {
  const { id, lessonSlug, h2Anchor, title, fields, initialValues, interactive = true } = props;

  // Initial state: prefer server-pre-populated values, fall back to "".
  const seed = useMemo<Readonly<Record<string, string>>>(() => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      out[f.key] = initialValues?.[f.key] ?? "";
    }
    return out;
  }, [fields, initialValues]);

  const [values, setValues] = useState<Readonly<Record<string, string>>>(seed);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const isDirty = useMemo(() => rowKey(values) !== rowKey(seed), [values, seed]);

  const handleChange = useCallback((fieldKey: string, next: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: next }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!interactive || !isDirty) return;
      setStatus("saving");
      try {
        const { saveWorksheetEntryAction } =
          await import("@/app/actions/saveWorksheetEntry.action");
        const result = await saveWorksheetEntryAction({
          studentId: "__self__", // overwritten server-side from session
          lessonSlug,
          h2Anchor,
          values,
        });
        if (result.ok) {
          setStatus("saved");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    },
    [interactive, isDirty, lessonSlug, h2Anchor, values],
  );

  return (
    <section
      id={id}
      className={styles.worksheet}
      data-h2-lesson={lessonSlug}
      data-h2-anchor={h2Anchor}
      aria-labelledby={`${id}-title`}
    >
      <form onSubmit={handleSubmit}>
        <header className={styles.header}>
          <span className={styles.eyebrow} aria-hidden="true">
            Capture for this section
          </span>
          <h3 id={`${id}-title`} className={styles.title}>
            {title}
          </h3>
        </header>

        {!interactive ? (
          <p className={styles.readOnlyNotice} role="status">
            Sign in to save your notes for this section.
          </p>
        ) : null}

        <div className={styles.fields}>
          {fields.map((field) => {
            const fieldId = `${id}-${field.key}`;
            return (
              <div key={field.key} className={styles.field}>
                <label htmlFor={fieldId} className={styles.label}>
                  {field.label}
                </label>
                <textarea
                  id={fieldId}
                  name={field.key}
                  className={styles.input}
                  placeholder={field.placeholder ?? ""}
                  value={values[field.key] ?? ""}
                  disabled={!interactive}
                  rows={3}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  aria-describedby={`${fieldId}-hint`}
                />
                <span id={`${fieldId}-hint`} className={styles.visuallyHidden}>
                  Notes are saved when you click Save notes.
                </span>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submit}
            disabled={!interactive || !isDirty || status === "saving"}
          >
            <FloppyDisk size={16} weight="bold" aria-hidden="true" />
            {status === "saving" ? "Saving…" : "Save notes"}
          </button>
          <span className={styles.status} aria-live="polite">
            {status === "saved" ? (
              <>
                <CheckCircle size={14} weight="fill" aria-hidden="true" />
                Saved
              </>
            ) : null}
            {status === "error" ? (
              <>
                <WarningCircle size={14} weight="fill" aria-hidden="true" />
                Couldn&apos;t save. Try again.
              </>
            ) : null}
          </span>
        </div>
      </form>
    </section>
  );
}
