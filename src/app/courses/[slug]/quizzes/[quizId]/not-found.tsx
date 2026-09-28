/**
 * not-found.tsx — 404 page for /courses/[slug]/quizzes/[quizId].
 *
 * Renders inside the StudentShell layout (sidebar + top bar + breadcrumb)
 * so users can navigate home. Migrated to CSS Modules + design tokens.
 */

import Link from "next/link";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./not-found.module.css";

export default function QuizNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.center}>
        <p className={styles.eyebrow}>Quiz Not Found</p>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>This quiz isn&apos;t available</h1>
        <p className={styles.subtitle}>
          The link may be broken, the quiz may have been removed, or you may not have access. Browse
          the course or head back to the dashboard.
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
