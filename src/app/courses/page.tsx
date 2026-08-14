/**
 * /courses — Course Catalog
 * STORY-014
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 *
 * Uses buildContainer() (the composition root) with the
 * ListCatalogCourses use case, which fetches courses from the
 * Course table and enriches them with module metadata from the
 * Module+Lesson tables (populated by the STORY-013 import script).
 *
 * ISR: course catalog data changes rarely (only on deploy via the
 * import script). Revalidate every hour to avoid hitting PostgreSQL
 * on every request while staying reasonably fresh.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;
import { buildContainer } from "@/composition/container";
import type { CatalogCourse } from "@/usecases/ListCatalogCourses";
import { getSessionUser } from "@/lib/auth";
import styles from "./page.module.css";
import { StudentShell } from "@/components/student/StudentShell";
import { CourseCover } from "@/components/student/CourseCover";

export const metadata: Metadata = {
  title: "Courses | Project Amazon PH Academy",
  description:
    "Expert-led Amazon PPC training for Filipino VAs. Agency-side ads work, taught in Filipino.",
};

export default async function CoursesPage() {
  const container = buildContainer();
  const [catalogResult, user] = await Promise.all([
    container.listCatalogCourses.execute(),
    getSessionUser(),
  ]);

  // Operational signal: log the catalog load outcome so a SRE can
  // tell from server logs whether the empty-state was caused by
  // "no rows" vs "DB error". Never exposed to students — the page
  // below always uses the safe, generic copy. console.warn is the
  // only console method that ESLint's `no-console` rule allows.
  if (process.env.NODE_ENV !== "test") {
    if (!catalogResult.ok) {
      console.warn("[courses] catalog load failed", catalogResult.error);
    } else {
      console.warn(
        `[courses] catalog loaded: ${catalogResult.value.courses.length} course(s)`,
      );
    }
  }

  if (!catalogResult.ok) {
    return (
      <StudentShell requireAuth={false}>
        <main className={styles.errorPage}>
          <h1 className={styles.errorTitle}>Courses unavailable</h1>
          <p className={styles.errorText}>
            We could not load the course catalog right now. Your account is unchanged. Refresh
            to try again.
          </p>
        </main>
      </StudentShell>
    );
  }

  const courses = catalogResult.value.courses;

  // M11 fix: build enrollment map for signed-in users
  const enrolledCourseIds = new Set<string>();
  if (user) {
    const enrollmentsResult = await container.enrollmentRepo.findByUserId(user.id);
    if (enrollmentsResult.ok) {
      for (const e of enrollmentsResult.value) {
        if (e.status === "active") enrolledCourseIds.add(e.courseId);
      }
    }
  }

  return (
    <StudentShell requireAuth={false}>
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Course Catalog</h1>
          <p className={styles.heroSubtitle}>
            Expert-led Amazon PPC training for Filipino VAs. Agency-side work, taught in Filipino.
            Learn at your own pace.
          </p>
        </section>

        {/* Grid */}
        <section className={styles.gridSection}>
          <div className={styles.grid}>
            {courses.map((catalogCourse: CatalogCourse, index: number) => (
              <CourseCard
                key={catalogCourse.course.id}
                catalogCourse={catalogCourse}
                isFeatured={index === 0}
                isEnrolled={enrolledCourseIds.has(catalogCourse.course.id)}
              />
            ))}
          </div>
          {courses.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--ink-500)" }}
            >
              <p>
                No published courses are available yet. Check back after the next content release.
              </p>
            </div>
          )}
        </section>
      </main>
    </StudentShell>
  );
}

function CourseCard({
  catalogCourse,
  isFeatured = false,
  isEnrolled = false,
}: {
  catalogCourse: CatalogCourse;
  isFeatured?: boolean;
  isEnrolled?: boolean;
}) {
  const { course, lessonCount, estimatedMinutes } = catalogCourse;
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  const priceDisplay = course.price.minor === 0 ? "FREE" : course.price.format();

  return (
    <Link href={`/courses/${course.slug}`} className={styles.card}>
      <CourseCover
        title={course.title}
        slug={course.slug}
        coverImage={course.coverImage}
        width={640}
        height={352}
        className={styles.cardImage}
      />

      <div className={styles.cardBody}>
        {isFeatured && (
          <span
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "2px 6px",
              background: "var(--accent-soft)",
              color: "var(--accent-text)",
              borderRadius: "4px",
              marginBottom: "var(--space-2)",
            }}
          >
            Featured
          </span>
        )}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{course.title}</h2>
          <span className={styles.cardPrice}>{priceDisplay}</span>
        </div>

        {isEnrolled && (
          <span
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "2px 6px",
              background: "var(--success-soft)",
              color: "var(--success)",
              borderRadius: "4px",
              marginBottom: "var(--space-2)",
            }}
          >
            Enrolled
          </span>
        )}

        {course.tagline && <p className={styles.cardTagline}>{course.tagline}</p>}

        <div className={styles.cardMeta}>
          {lessonCount > 0 ? (
            <>
              <span>
                {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
              </span>
              {estimatedMinutes > 0 && (
                <span>
                  {hours > 0 ? `${hours}h ` : ""}
                  {minutes}m video
                </span>
              )}
            </>
          ) : (
            <span>Live cohort + 1:1 review</span>
          )}
        </div>
      </div>
    </Link>
  );
}
