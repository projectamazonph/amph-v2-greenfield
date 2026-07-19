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

import Link from "next/link";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import type { Course } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { Result } from "@/domain/shared/Result";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface CourseWithEnrollment {
  course: Course;
  enrollment: Enrollment;
}

async function loadEnrollmentsWithCourses(
  userId: string,
): Promise<CourseWithEnrollment[]> {
  const container = buildContainer();
  const enrollmentsResult = await container.enrollmentRepo.findByUserId(userId);
  if (!enrollmentsResult.ok) {
    return [];
  }
  const enrollments = enrollmentsResult.value;

  const pairs: CourseWithEnrollment[] = [];
  for (const enrollment of enrollments) {
    const courseResult = await container.courseRepo.findById(enrollment.courseId);
    if (Result.isOk(courseResult)) {
      pairs.push({ course: courseResult.value, enrollment });
    }
  }
  return pairs;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    // Proxy should have caught this; defensive redirect.
    redirect("/login?redirect=/dashboard");
  }

  const pairs = await loadEnrollmentsWithCourses(user.id);

  // "Continue learning" = in-progress (0 < progress < 100)
  const inProgress = pairs.filter(
    (p) => p.enrollment.progressPercent > 0 && p.enrollment.progressPercent < 100,
  );
  // "All my courses" includes everything (active, in-progress, completed)
  const allActive = pairs.filter((p) => p.enrollment.status === "active");

  return (
    <main className={styles.page}>
      {/* Welcome */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Welcome back, {user.firstName}.</h1>
        <p className={styles.heroSubtitle}>
          {allActive.length === 0
            ? "You haven't started any courses yet."
            : `You're enrolled in ${allActive.length} course${allActive.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      {/* Continue learning */}
      {inProgress.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Continue learning</h2>
          <div className={styles.grid}>
            {inProgress.map(({ course, enrollment }) => (
              <Link
                key={enrollment.id}
                href={`/courses/${course.slug}`}
                className={styles.card}
              >
                <h3 className={styles.cardTitle}>{course.title}</h3>
                <p className={styles.cardTagline}>{course.tagline}</p>
                <div className={styles.progressBar} aria-hidden="true">
                  <div
                    className={styles.progressFill}
                    style={{ width: `${enrollment.progressPercent}%` }}
                  />
                </div>
                <p className={styles.progressLabel}>
                  {enrollment.progressPercent}% complete
                </p>
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
            Browse the catalog →
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
                <Link
                  href={`/courses/${course.slug}`}
                  className={styles.listLink}
                >
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{course.title}</span>
                    <span className={styles.listTagline}>{course.tagline}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <span className={styles.listProgress}>
                      {enrollment.progressPercent}%
                    </span>
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

      {/* Account link */}
      <section className={styles.section}>
        <Link href="/logout" className={styles.mutedLink}>
          Sign out
        </Link>
      </section>
    </main>
  );
}
