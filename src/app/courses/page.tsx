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
import styles from "./page.module.css";
import { StudentShell } from "@/components/student/StudentShell";

export const metadata: Metadata = {
  title: "Courses — Project Amazon PH Academy",
  description:
    "Expert-led Amazon PPC training for Filipino VAs. Agency-side ads work, taught in Filipino.",
};

export default async function CoursesPage() {
  const container = buildContainer();
  const result = await container.listCatalogCourses.execute();

  if (!result.ok) {
    return (
      <StudentShell requireAuth={false}>
        <main className={styles.errorPage}>
          <p className={styles.errorText}>Unable to load courses. Please try again later.</p>
        </main>
      </StudentShell>
    );
  }

  const courses = result.value.courses;

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
              />
            ))}
          </div>
          {courses.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--ink-500)" }}
            >
              <p>No courses available yet. Check back soon.</p>
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
}: {
  catalogCourse: CatalogCourse;
  isFeatured?: boolean;
}) {
  const { course, lessonCount, estimatedMinutes } = catalogCourse;
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  const priceDisplay = course.price.minor === 0 ? "FREE" : course.price.format();

  return (
    <Link href={`/courses/${course.slug}`} className={styles.card}>
      {course.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.coverImage}
          alt={course.title}
          width={640}
          height={352}
          loading="lazy"
          decoding="async"
          className={styles.cardImage}
        />
      ) : (
        <div className={styles.cardImagePlaceholder}>
          <span className={styles.cardImagePlaceholderLetter}>{course.title[0]}</span>
        </div>
      )}

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
              color: "var(--accent)",
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
