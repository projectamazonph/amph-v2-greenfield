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
import { nextIncompleteLesson } from "@/app/courses/[slug]/lessons/getLessonData";
import { CourseCover } from "@/components/student/CourseCover";
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

  // Resume the newest active course at its next incomplete lesson. If a
  // learner has not completed anything yet, this deliberately becomes a
  // start CTA rather than forcing them through the course overview first.
  const resumePair = allActive
    .filter((pair) => pair.enrollment.progressPercent < 100)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.enrollment.createdAt).getTime() -
        new Date(a.enrollment.createdAt).getTime(),
    )[0];
  const resumeLesson = resumePair
    ? nextIncompleteLesson(
        resumePair.course,
        resumePair.enrollment.completedLessonIds,
        resumePair.enrollment.lastLessonId ?? "",
      )
    : null;

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

        {resumePair && resumeLesson && (
          <section className={styles.continueCard} aria-labelledby="continue-learning-title">
            <div className={styles.continueEyebrow}>
              {resumePair.enrollment.progressPercent === 0
                ? "Start your course"
                : "Pick up where you left off"}
            </div>
            <h2 id="continue-learning-title" className={styles.continueTitle}>
              {resumePair.course.title}
            </h2>
            <p className={styles.continueLesson}>
              Next up: <strong>{resumeLesson.title}</strong>
            </p>
            <Link
              href={`/courses/${resumePair.course.slug}/lessons/${resumeLesson.id}`}
              className={styles.continueBtn}
            >
              {resumePair.enrollment.progressPercent === 0 ? "Start lesson" : "Continue learning"}
            </Link>
          </section>
        )}

        {/* Continue learning */}
        {inProgress.length > 0 && (
          <section className={styles.section} aria-labelledby="continue-learning-section-title">
            <h2 id="continue-learning-section-title" className={styles.sectionTitle}>
              Continue learning
            </h2>
            <div className={styles.grid}>
              {inProgress.map(({ course, enrollment }) => (
                <Link key={enrollment.id} href={`/courses/${course.slug}`} className={styles.card}>
                  <CourseCover
                    title={course.title}
                    slug={course.slug}
                    coverImage={course.coverImage}
                    width={640}
                    height={240}
                    className={styles.cardCover}
                  />
                  <h3 className={styles.cardTitle}>{course.title}</h3>
                  <p className={styles.cardTagline}>{course.tagline}</p>
                  <div
                    className={styles.progressBar}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={enrollment.progressPercent}
                    aria-label={`${course.title} progress: ${enrollment.progressPercent}% complete`}
                  >
                    <div
                      className={styles.progressFill}
                      style={{ width: `${enrollment.progressPercent}%` }}
                      aria-hidden="true"
                    />
                    {[25, 50, 75].map((pct) => (
                      <span
                        key={pct}
                        className={`${styles.milestone} ${enrollment.progressPercent >= pct ? styles.reached : ""}`}
                        style={{ left: `${pct}%` }}
                        aria-hidden="true"
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
        <section className={styles.section} aria-labelledby="my-courses-title">
          <div className={styles.sectionHeader}>
            <h2 id="my-courses-title" className={styles.sectionTitle}>My courses</h2>
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
        <section className={styles.section} aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className={styles.sectionTitle}>Quick Actions</h2>
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
