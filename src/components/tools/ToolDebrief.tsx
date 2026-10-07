"use client";

import Link from "next/link";
import { useState } from "react";
import type { ArtefactActionResult, SaveArtefactActionInput } from "@/app/actions/artefact.action";
import styles from "./ToolDebrief.module.css";

export interface ToolDebriefSaveAction {
  save: (
    input: SaveArtefactActionInput,
  ) => Promise<ArtefactActionResult<{ id: string; status: string }>>;
}

export interface ToolDebriefProps {
  readonly simulatorId: string;
  readonly scoreLabel: string;
  readonly whyItMatters: string;
  readonly lessonHref: string;
  readonly lessonLabel: string;
  readonly retryHref: string;
  readonly rationalePrompt: string;
  /**
   * LEARN-034 save bindings. When present, the rationale block
   * gains a "Save to portfolio" button that persists the text as a
   * DRAFT artefact. Absent = prompt-only (the LEARN-032 behaviour).
   * Server-action bindings flow server → client so unit tests never
   * import a use-server module.
   */
  readonly saveAction?: ToolDebriefSaveAction;
  readonly artefactKind?: string;
  readonly scenarioRef?: string | null;
  readonly courseId?: string | null;
}

type SaveState =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/**
 * ToolDebrief — post-attempt debrief pattern (LEARN-032, LEARN-034).
 *
 * Five sections, always in this order:
 * 1. Result summary (plain language, never a certification claim).
 * 2. Why it matters (one paragraph tying the score to client work).
 * 3. Targeted lesson revisit (link; the learner keeps the attempt record).
 * 4. Retry (link to a fresh attempt; the completed record is untouched).
 * 5. Rationale prompt (labelled textarea; the learner states the
 *    reason in their own words, then optionally saves it to the
 *    portfolio as a DRAFT artefact).
 */
export function ToolDebrief({
  simulatorId,
  scoreLabel,
  whyItMatters,
  lessonHref,
  lessonLabel,
  retryHref,
  rationalePrompt,
  saveAction,
  artefactKind,
  scenarioRef,
  courseId,
}: ToolDebriefProps) {
  const [rationale, setRationale] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const textareaId = `debrief-rationale-${simulatorId}`;
  // CLICK-PATH-008: editing after a save re-arms the button so v2 can be
  // saved. The save handler stamps savedText; any divergence means unsaved
  // edits exist and the button must come back.
  const [savedText, setSavedText] = useState<string | null>(null);
  const editedSinceSave =
    saveState.kind === "saved" && savedText !== null && rationale.trim() !== savedText;
  const canSave =
    saveAction !== undefined &&
    artefactKind !== undefined &&
    rationale.trim().length > 0 &&
    saveState.kind !== "saving" &&
    (saveState.kind !== "saved" || editedSinceSave);

  async function onSave() {
    if (!saveAction || !artefactKind || rationale.trim().length === 0) return;
    // Re-save after an edit starts from idle so the button copy resets.
    if (editedSinceSave) setSaveState({ kind: "idle" });
    setSaveState({ kind: "saving" });
    try {
      const trimmed = rationale.trim();
      const result = await saveAction.save({
        courseId: courseId ?? null,
        kind: artefactKind,
        title: `${simulatorId} rationale`,
        scenarioRef: scenarioRef ?? null,
        rationale: trimmed,
      });
      if (result.ok) {
        setSavedText(trimmed);
        setSaveState({ kind: "saved" });
      } else {
        setSaveState({
          kind: "error",
          message: "Could not save right now. Your text is kept — try again.",
        });
      }
    } catch {
      setSaveState({
        kind: "error",
        message: "Could not save right now. Your text is kept — try again.",
      });
    }
  }

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
        {saveAction !== undefined ? (
          <div className={styles.saveRow}>
            <button
              type="button"
              className={styles.saveButton}
              disabled={!canSave}
              onClick={() => void onSave()}
            >
              {saveState.kind === "saving" ? "Saving…" : "Save to portfolio"}
            </button>
            {saveState.kind === "saved" ? (
              <p className={styles.saveSuccess} role="status">
                Saved as a draft.{" "}
                <Link href="/portfolio" className={styles.link}>
                  Open portfolio
                </Link>
              </p>
            ) : null}
            {saveState.kind === "error" ? (
              <p className={styles.saveError} role="alert">
                {saveState.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
