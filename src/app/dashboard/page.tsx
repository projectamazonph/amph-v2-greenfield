/**
 * /dashboard — authenticated student dashboard.
 *
 * P0-4 fix: this route did not exist; signup/login redirects to
 * /dashboard 404'd. Now it does, and it lists the user's active
 * enrollments with their progress.
 *
 * The /proxy.ts already redirects unauthenticated users from
 * /dashboard to /login. This page assumes `getSessionUser()`
 * returns a non-null user.
 */

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import type { Course } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface CourseWithEnrollment {
  course: Course;
  enrollment: Enrollment;
}

async function loadEnrollmentsWithCourses(userId: string): Promise<CourseWithEnrollment[]> {
  const container = buildContainer();
  const enrollmentsResult = await container.enrollmentRepo.findByUserId(userId);
  if (!enrollmentsResult.ok) {
    throw new Error("Failed to load enrollments");
  }
  const enrollments = enrollmentsResult.value;
  return Promise.all(
    enrollments.map(async (enrollment): Promise<CourseWithEnrollment> => {
      const courseResult = await container.courseRepo.findById(enrollment.courseId);
      if (!courseResult.ok) {
        throw new Error("Failed to load an enrolled course");
      }
      return { course: courseResult.value, enrollment };
    }),
  );
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const pairs = await loadEnrollmentsWithCourses(user.id);

  // "Continue learning" = in-progress (0 < progress < 100)
  const inProgress = pairs.filter(
    (p) => p.enrollment.progressPercent > 0 && p.enrollment.progressPercent < 100,
  );
  // "All my courses" includes everything (active, in-progress, completed)
  const allActive = pairs.filter((p) => p.enrollment.status === "active");

  // Smart suggestion: pick the most recently enrolled in-progress enrollment.
  // (No `lastAccessedAt` field exists on Enrollment — sort by `createdAt` as
  // the closest proxy: newest enrollment ≈ most recent activity.)
  const lastAccessedCourse =
    inProgress.length > 0
      ? inProgress
          .slice()
          .sort(
            (a, b) =>
              new Date(b.enrollment.createdAt).getTime() -
              new Date(a.enrollment.createdAt).getTime(),
          )[0]?.course
      : undefined;

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        {/* Welcome */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Welcome back, {user.firstName}.</h1>
          <p className={styles.heroSubtitle}>
            {allActive.length === 0
              ? "You haven't started any courses yet."
              : `You're enrolled in ${allActive.length} course${allActive.length === 1 ? "" : "s"}.`}
          </p>
        </header>

        {lastAccessedCourse && (
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-5)",
              marginBottom: "var(--space-8)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--accent-text)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-2)",
              }}
            >
              {/* M7 fix: label honestly reflects what this card shows — the
                 most recently enrolled in-progress course. 'Your courses' was
                 misleading because this card is only one course, not all courses. */}
              Continue where you enrolled
            </div>
            <div style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>
              {lastAccessedCourse.title}
            </div>
            <Link href={`/courses/${lastAccessedCourse.slug}`} className={styles.continueBtn}>
              Continue
            </Link>
          </div>
        )}

        {/* Continue learning */}
        {inProgress.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Continue learning</h2>
            <div className={styles.grid}>
              {inProgress.map(({ course, enrollment }) => (
                <Link key={enrollment.id} href={`/courses/${course.slug}`} className={styles.card}>
                  <h3 className={styles.cardTitle}>{course.title}</h3>
                  <p className={styles.cardTagline}>{course.tagline}</p>
                  <div className={styles.progressBar} aria-hidden="true">
                    <div
                      className={styles.progressFill}
                      style={{ width: `${enrollment.progressPercent}%` }}
                    />
                    {[25, 50, 75].map((pct) => (
                      <span
                        key={pct}
                        className={`${styles.milestone} ${enrollment.progressPercent >= pct ? styles.reached : ""}`}
                        style={{ left: `${pct}%` }}
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className={styles.progressLabel}>{enrollment.progressPercent}% complete</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* My courses */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>My courses</h2>
            <Link href="/courses" className={styles.browseLink}>
              Browse the catalog <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          {allActive.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                You don't have any courses yet. Browse the catalog to get started.
              </p>
              <Link href="/courses" className={styles.browseButton}>
                Browse courses
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {allActive.map(({ course, enrollment }) => (
                <li key={enrollment.id} className={styles.listItem}>
                  <Link href={`/courses/${course.slug}`} className={styles.listLink}>
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>{course.title}</span>
                      <span className={styles.listTagline}>{course.tagline}</span>
                    </div>
                    <div className={styles.listMeta}>
                      <span className={styles.listProgress}>{enrollment.progressPercent}%</span>
                      {enrollment.progressPercent === 100 && (
                        <span className={styles.completedBadge}>Completed</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick Actions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.quickActions}>
            <Link href="/courses" className={styles.quickBtn}>
              Browse Catalog
            </Link>
            <Link href="/tools" className={styles.quickBtn}>
              Simulators
            </Link>
            <Link href="/profile" className={styles.quickBtn}>
              My Profile
            </Link>
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
