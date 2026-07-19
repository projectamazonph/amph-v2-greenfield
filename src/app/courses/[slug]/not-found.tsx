/**
 * not-found.tsx — 404 page for the /courses/[slug] route.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./not-found.module.css";

export default function CourseNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.center}>
        <h1 className={styles.title}>Course Not Found</h1>
        <p className={styles.subtitle}>
          This course doesn&apos;t exist or has been removed.
        </p>
        <Link href="/courses">
          <Button variant="primary" size="lg">
            Browse All Courses
          </Button>
        </Link>
      </div>
    </main>
  );
}
