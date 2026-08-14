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
import { Warning } from "@phosphor-icons/react/dist/ssr";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./not-found.module.css";

export default function CertificateNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.center}>
        <div className={styles.iconCircle}>
          <Warning size={32} weight="fill" className={styles.icon} aria-hidden />
        </div>
        <h1 className={styles.title}>Certificate Not Found</h1>
        <p className={styles.subtitle}>
          The verification link is invalid, malformed, or the certificate has been removed.
          Double-check the URL or contact the issuer.
        </p>
        <div className={styles.actions}>
          <Link
            href="/courses"
            className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.lg].join(" ")}
          >
            Browse Courses
          </Link>
          <Link
            href="/"
            className={[buttonStyles.btn, buttonStyles.secondary, buttonStyles.lg].join(" ")}
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
