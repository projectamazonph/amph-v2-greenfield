/**
 * NewAssignmentForm — client form for /admin/assignments/new.
 *
 * Posts to `createAssignmentAction` and renders inline errors.
 * Real labels on every field, per the product copy rules.
 */

"use client";

import { useActionState } from "react";
import {
  createAssignmentAction,
  type AdminAssignmentFormResult,
} from "@/app/actions/adminAssignment.action";
import styles from "../page.module.css";

const initialState: AdminAssignmentFormResult | null = null;

interface Props {
  courses: readonly { id: string; title: string }[];
}

export function NewAssignmentForm({ courses }: Props) {
  const [state, formAction, isPending] = useActionState(
    createAssignmentAction,
    initialState,
  );

  const errorText = state?.kind === "error" ? (state.message ?? state.error) : null;

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Course</span>
        <select name="courseId" required className={styles.select} disabled={isPending}>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Student email</span>
        <input
          type="email"
          name="userEmail"
          required
          placeholder="student@example.com"
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          type="text"
          name="title"
          required
          maxLength={120}
          placeholder="Audit a listing"
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>What must the student do</span>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="Run the listing audit on your practice ASIN and note the top three fixes."
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Due date</span>
        <input
          type="datetime-local"
          name="dueAt"
          required
          className={styles.searchInput}
          disabled={isPending}
        />
      </label>
      {errorText && (
        <p role="alert" className={styles.error}>
          {errorText}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.filterButton}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Assign work"}
        </button>
      </div>
    </form>
  );
}
