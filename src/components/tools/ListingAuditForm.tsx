/**
 * ListingAuditForm — client component.
 *
 * Three stages:
 *  1. "editing" — pre-fills a listing (title, bullets, description) and
 *     lets the student revise it. "Run audit" calls auditListing() (a
 *     preview: findings against the current content, no persisted attempt).
 *  2. "reviewing" — the student triages each finding as fix now / defer /
 *     skip / escalate (STORY-083), mirroring a real reviewer's workflow of
 *     deciding what to act on, what to schedule, what's a non-issue, and
 *     what needs a second opinion. "Submit for grading" calls
 *     listingAuditAttempt() with those decisions, which persists a real
 *     graded SimulatorAttempt.
 *  3. "graded" — shows the score, the resolved expected action + rationale
 *     per finding, and formative feedback.
 *
 * "Start over" returns to stage 1 without losing the edited content, in
 * case the student wants to revise the listing based on what the findings
 * revealed.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./ListingAuditForm.module.css";
import {
  auditListing,
  listingAuditAttempt,
  type ListingAuditAttemptResponse,
} from "@/app/tools/listing-audit/actions";
import type {
  AuditFinding,
  FindingAction,
} from "@/domain/simulator/listing-audit/ListingAuditOutput";
import { FormativeScoreNotice } from "./FormativeScoreNotice";
import { SimulatorModeToggle } from "./SimulatorModeToggle";
import type { PracticeOrChallengeMode } from "./SimulatorModeToggle";
import { studentErrorCopy } from "@/lib/studentErrorCopy";

interface Props {
  initialTitle: string;
  initialBullets: ReadonlyArray<string>;
  initialDescription: string;
  challengeUnlocked: boolean;
}

type Stage = "editing" | "reviewing" | "graded";

const FINDING_ACTIONS: ReadonlyArray<{ value: FindingAction; label: string }> = [
  { value: "fixNow", label: "Fix now" },
  { value: "defer", label: "Defer" },
  { value: "skip", label: "Skip" },
  { value: "escalate", label: "Escalate" },
];

export function ListingAuditForm({
  initialTitle,
  initialBullets,
  initialDescription,
  challengeUnlocked,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [bullets, setBullets] = useState<string[]>([...initialBullets]);
  const [description, setDescription] = useState(initialDescription);
  const [mode, setMode] = useState<PracticeOrChallengeMode>("practice");
  const [stage, setStage] = useState<Stage>("editing");
  const [findings, setFindings] = useState<readonly AuditFinding[]>([]);
  const [findingActions, setFindingActions] = useState<Record<string, FindingAction>>({});
  const [gradeResult, setGradeResult] = useState<ListingAuditAttemptResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateBullet = (i: number, value: string) => {
    setBullets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
  };

  const setFindingAction = (findingId: string, action: FindingAction) => {
    setFindingActions((prev) => ({ ...prev, [findingId]: action }));
  };

  const onRunAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await auditListing({
          title,
          bullets: bullets.filter((b) => b.length > 0),
          description,
        });
        if (!r.ok) {
          setError(r.error.message);
          return;
        }
        setFindings(r.value.audit.findings);
        setFindingActions(
          Object.fromEntries(r.value.audit.findings.map((f) => [f.id, "skip" as FindingAction])),
        );
        setStage("reviewing");
      } catch {
        setError(studentErrorCopy.simulatorRun);
      }
    });
  };

  const onSubmitForGrading = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await listingAuditAttempt({
          title,
          bullets: bullets.filter((b) => b.length > 0),
          description,
          userFindingActions: findingActions,
          mode,
        });
        if (!r.ok) {
          setError("message" in r.error ? r.error.message : studentErrorCopy.simulatorGrade);
          return;
        }
        setGradeResult(r);
        setStage("graded");
      } catch {
        setError(studentErrorCopy.simulatorGrade);
      }
    });
  };

  const onStartOver = () => {
    setError(null);
    setFindings([]);
    setFindingActions({});
    setGradeResult(null);
    setStage("editing");
  };

  const isEditing = stage === "editing";
  const gradedFindingsById =
    gradeResult && gradeResult.ok
      ? new Map(gradeResult.value.gradedFindings.map((f) => [f.id, f]))
      : null;

  return (
    <form className={styles.form} onSubmit={isEditing ? onRunAudit : (e) => e.preventDefault()}>
      <SimulatorModeToggle
        mode={mode}
        onChange={setMode}
        unlocked={challengeUnlocked}
        disabled={stage === "graded"}
      />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="la-title">
          Title
        </label>
        <input
          id="la-title"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={!isEditing}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Bullets ({bullets.length})</span>
        <div className={styles.bullets}>
          {bullets.map((b, i) => (
            <div key={i} className={styles.bulletRow}>
              <span className={styles.bulletNum}>{i + 1}</span>
              <input
                className={styles.input}
                value={b}
                onChange={(e) => updateBullet(i, e.target.value)}
                disabled={!isEditing}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="la-description">
          Description
        </label>
        <textarea
          id="la-description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          disabled={!isEditing}
        />
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.footer}>
        {isEditing ? (
          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? "Auditing…" : "Run audit"}
          </button>
        ) : (
          <>
            {stage === "reviewing" ? (
              <button
                type="button"
                className={styles.submit}
                onClick={onSubmitForGrading}
                disabled={pending}
              >
                {pending ? "Grading…" : "Submit for grading"}
              </button>
            ) : (
              <button type="button" className={styles.submit} onClick={onStartOver}>
                Start over
              </button>
            )}
            {stage === "graded" ? (
              <button type="button" className={styles.cancelButton} onClick={onStartOver}>
                Audit another version
              </button>
            ) : null}
          </>
        )}
        {gradeResult && gradeResult.ok ? (
          <div
            className={styles.score}
            style={{
              color:
                gradeResult.value.overallScore >= 80
                  ? "var(--success)"
                  : gradeResult.value.overallScore >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {gradeResult.value.overallScore}%
          </div>
        ) : null}
      </div>
      {gradeResult && gradeResult.ok ? <FormativeScoreNotice /> : null}
      {gradeResult && gradeResult.ok && gradeResult.value.xpAwarded ? (
        <p className={styles.xpBanner}>
          +{gradeResult.value.xpAwarded} XP earned for passing in Challenge mode.
        </p>
      ) : null}
      {gradeResult && gradeResult.ok ? (
        <p className={styles.error} style={{ color: "var(--ink-700)" }}>
          {gradeResult.value.feedback.overallComment}
        </p>
      ) : null}
      {stage !== "editing" ? (
        <div className={styles.findings}>
          <h3 className={styles.findingsTitle}>
            Findings — triage each one as fix now, defer, skip, or escalate
          </h3>
          <ul className={styles.findingsList}>
            {findings.map((f) => {
              const graded = gradedFindingsById?.get(f.id);
              return (
                <li key={f.id} className={styles.finding}>
                  <span className={styles.findingSev} data-sev={f.severity}>
                    {f.severity}
                  </span>
                  <span className={styles.findingCategory}>{f.dimension}</span>
                  <span className={styles.findingMessage}>{f.message}</span>
                  {graded ? (
                    <span
                      className={styles.resultBadge}
                      data-correct={graded.isCorrect ? "true" : "false"}
                      title={graded.rationale}
                    >
                      {graded.isCorrect ? "✓ correct" : `✗ expected ${graded.expectedAction}`}
                    </span>
                  ) : (
                    <select
                      className={styles.select}
                      value={findingActions[f.id] ?? "skip"}
                      onChange={(e) => setFindingAction(f.id, e.target.value as FindingAction)}
                      aria-label={`Action for finding: ${f.message}`}
                    >
                      {FINDING_ACTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
