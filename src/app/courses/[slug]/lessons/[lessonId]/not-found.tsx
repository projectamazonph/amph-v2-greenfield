/**
 * not-found.tsx — 404 page for /courses/[slug]/lessons/[lessonId].
 *
 * Without this file, an unmatched lesson id falls through to the route's
 * loading.tsx skeleton (or Next.js' bare default) and the user sees three
 * grey rectangles with no nav, no message, no next step. This renders the
 * root layout shell (sidebar + top bar) so users can navigate home.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./not-found.module.css";

export default function LessonNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.center}>
        <p className={styles.eyebrow}>Lesson Not Found</p>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>This lesson isn&apos;t available</h1>
        <p className={styles.subtitle}>
          The link may be broken, the lesson may have been removed, or you may not have access.
          Browse the course or head back to the dashboard.
        </p>
        <div className={styles.actions}>
          <Link
            href="/courses"
            className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.lg].join(" ")}
          >
            Browse courses
          </Link>
          <Link
            href="/dashboard"
            className={[buttonStyles.btn, buttonStyles.secondary, buttonStyles.lg].join(" ")}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
