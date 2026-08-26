/**
 * not-found.tsx — Root 404 page.
 *
 * Renders when no other route's notFound() handler catches the
 * unmatched URL. Amazon PH simulator layout: centered card, off-white
 * surface, mono "404" mark, two clear next-step links.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.center}>
        <p className={styles.eyebrow}>Page not found</p>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>This page doesn&apos;t exist</h1>
        <p className={styles.subtitle}>
          The link may be broken or the page may have been moved. Try the catalog or head
          back to the dashboard.
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
