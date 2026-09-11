/**
 * PrerequisiteManager — client UI for /admin/courses/[id]/prerequisites.
 *
 * Lists the live rules with per-rule remove buttons, plus an add form:
 * pick a required course, optionally narrow to one of its lessons
 * ("Whole course" means every lesson must be complete). Both forms
 * post to the prerequisite server actions and render inline errors.
 */

"use client";

import { useActionState, useState } from "react";
import {
  removePrerequisiteAction,
  setPrerequisiteAction,
  type PrerequisiteFormResult,
} from "@/app/actions/prerequisite.action";
import styles from "./page.module.css";

export interface PrerequisiteRuleView {
  courseId: string;
  requiresCourseId: string;
  requiresLessonId: string | null;
  requiresCourseTitle: string;
  requiresLessonTitle: string | null;
}

export interface PrerequisiteCourseOption {
  id: string;
  title: string;
  lessons: readonly { id: string; title: string }[];
}

interface Props {
  courseId: string;
  rules: readonly PrerequisiteRuleView[];
  otherCourses: readonly PrerequisiteCourseOption[];
}

const initialState: PrerequisiteFormResult | null = null;

function RemoveRuleButton({ rule }: { rule: PrerequisiteRuleView }) {
  const [state, formAction, isPending] = useActionState(
    removePrerequisiteAction,
    initialState,
  );
  return (
    <form action={formAction} className={styles.removeForm}>
      <input type="hidden" name="courseId" value={rule.courseId} />
      <input type="hidden" name="requiresCourseId" value={rule.requiresCourseId} />
      <input
        type="hidden"
        name="requiresLessonId"
        value={rule.requiresLessonId ?? ""}
      />
      <button type="submit" className={styles.remove} disabled={isPending}>
        {isPending ? "Removing..." : "Remove"}
      </button>
      {state?.kind === "error" && (
        <span role="alert" className={styles.error}>
          {state.message ?? state.error}
        </span>
      )}
    </form>
  );
}

export function PrerequisiteManager({ courseId, rules, otherCourses }: Props) {
  const [state, formAction, isPending] = useActionState(
    setPrerequisiteAction,
    initialState,
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    otherCourses[0]?.id ?? "",
  );
  const selectedCourse = otherCourses.find((c) => c.id === selectedCourseId) ?? null;

  const errorText = state?.kind === "error" ? (state.message ?? state.error) : null;

  return (
    <div>
      <h2 className={styles.sectionTitle}>Live rules ({rules.length})</h2>
      {rules.length === 0 ? (
        <p className={styles.empty}>
          No prerequisites. Anyone eligible can enroll right away.
        </p>
      ) : (
        <ul className={styles.ruleList}>
          {rules.map((rule) => (
            <li key={`${rule.requiresCourseId}:${rule.requiresLessonId ?? "course"}`} className={styles.ruleRow}>
              <span className={styles.ruleText}>
                Requires{" "}
                <strong>{rule.requiresCourseTitle}</strong>
                {rule.requiresLessonTitle !== null && (
                  <>
                    {" "}lesson <strong>{rule.requiresLessonTitle}</strong>
                  </>
                )}
                {rule.requiresLessonTitle === null && " (whole course)"}
              </span>
              <RemoveRuleButton rule={rule} />
            </li>
          ))}
        </ul>
      )}

      <h2 className={styles.sectionTitle}>Add a rule</h2>
      <form action={formAction} className={styles.form}>
        <input type="hidden" name="courseId" value={courseId} />
        <label className={styles.field}>
          <span className={styles.label}>Required course</span>
          <select
            name="requiresCourseId"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className={styles.select}
            disabled={isPending || otherCourses.length === 0}
          >
            {otherCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Scope</span>
          <select name="requiresLessonId" className={styles.select} disabled={isPending}>
            <option value="">Whole course (finish every lesson)</option>
            {(selectedCourse?.lessons ?? []).map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                Lesson: {lesson.title}
              </option>
            ))}
          </select>
        </label>
        {errorText && (
          <p role="alert" className={styles.error}>
            {errorText}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submit}
            disabled={isPending || otherCourses.length === 0}
            aria-busy={isPending}
          >
            {isPending ? "Saving..." : "Add rule"}
          </button>
        </div>
      </form>
    </div>
  );
}
