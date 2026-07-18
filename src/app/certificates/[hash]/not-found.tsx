/**
 * /certificates/[hash] not-found view
 * STORY-043
 *
 * Shown when the verification hash doesn't match any certificate
 * (or is malformed — Next.js routes here from any notFound() call).
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./not-found.module.css";

export default function CertificateNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.center}>
        <div className={styles.iconCircle}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className={styles.title}>Certificate Not Found</h1>
        <p className={styles.subtitle}>
          The verification link is invalid, malformed, or the certificate
          has been removed. Double-check the URL or contact the issuer.
        </p>
        <div className={styles.actions}>
          <Link href="/courses">
            <Button variant="primary" size="lg">
              Browse Courses
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary" size="lg">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
