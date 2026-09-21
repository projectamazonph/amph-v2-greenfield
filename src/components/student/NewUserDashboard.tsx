/**
 * NewUserDashboard — first-run dashboard variant (STORY-146).
 *
 * Renders for students who have just signed up and not yet completed the
 * welcome tour. Big "Pick your first course" hero, a what-you'll-find grid
 * (Courses / Dashboard / Simulators), and a footer FAQ link.
 *
 * Server component: receives a `user` prop with at least `firstName`; the
 * dashboard page is responsible for switching into this variant when
 * `!hasCompletedWelcome(user) && allActive.length === 0`.
 */

import Link from "next/link";
import styles from "./NewUserDashboard.module.css";

export interface NewUserDashboardUser {
  readonly firstName: string;
}

export function NewUserDashboard({ user }: { user: NewUserDashboardUser }) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Welcome to AMPH, {user.firstName}.</h1>
        <p className={styles.heroSubtitle}>
          Pick a course to start learning. You can change it any time.
        </p>
        <Link href="/courses" className={styles.heroCta}>
          Browse courses
        </Link>
      </header>

      <section className={styles.cards} aria-label="What you'll find">
        <Link href="/courses" className={styles.card}>
          <h2 className={styles.cardTitle}>Courses</h2>
          <p className={styles.cardBody}>
            Short lessons, quick quizzes, progress that saves automatically.
          </p>
        </Link>
        <Link href="/dashboard" className={styles.card}>
          <h2 className={styles.cardTitle}>Dashboard</h2>
          <p className={styles.cardBody}>Your home base — progress, what to do next, quick links.</p>
        </Link>
        <Link href="/tools" className={styles.card}>
          <h2 className={styles.cardTitle}>Simulators</h2>
          <p className={styles.cardBody}>Practice PPC without burning real ad spend.</p>
        </Link>
      </section>

      <footer className={styles.footer}>
        Need help? <Link href="/faq">Visit the FAQ</Link>.
      </footer>
    </main>
  );
}
