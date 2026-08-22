import Link from "next/link";
import styles from "./PublicCatalogHeader.module.css";

/**
 * PublicCatalogHeader — slim top bar shown on pages where
 * `StudentShell` is in `requireAuth={false}` mode (the course
 * catalog + course detail).
 *
 * Renders:
 *   - Brand link (→ /courses)
 *   - Sign in (→ /login)
 *   - Sign up (→ /signup) — primary CTA for anonymous visitors
 *
 * Pure server component. No client JS, no session probe (StudentShell
 * already knows whether we're authenticated). Anonymous-only on
 * purpose: when a logged-in visitor lands on /courses, StudentShell
 * falls into the full sidebar branch instead of rendering this
 * header.
 *
 * Tailwind-free per project convention; uses CSS Modules.
 */

export function PublicCatalogHeader() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/courses" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span className={styles.brandMarkSquare} />
            <span className={styles.brandMarkSquare} />
            <span className={styles.brandMarkSquare} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Amazon PH Academy</span>
            <span className={styles.brandSub}>Course Catalog</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Public catalog navigation">
          <Link href="/courses" className={styles.navLink}>
            Courses
          </Link>
          <Link href="/live-classes" className={styles.navLink}>
            Live classes
          </Link>
          <Link href="/faq" className={styles.navLink}>
            FAQ
          </Link>
          <Link href="/login" className={styles.signIn}>
            Sign in
          </Link>
          <Link href="/signup" className={styles.signUp}>
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}