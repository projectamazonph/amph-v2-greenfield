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
 */

import Link from "next/link";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import type { CatalogCourse } from "@/usecases/ListCatalogCourses";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Courses — Project Amazon PH Academy",
  description: "Expert-led Amazon FBA courses taught in Filipino.",
};

export default async function CoursesPage() {
  const container = buildContainer();
  const result = await container.listCatalogCourses.execute();

  if (!result.ok) {
    return (
      <main className={styles.errorPage}>
        <p className={styles.errorText}>Unable to load courses. Please try again later.</p>
      </main>
    );
  }

  const courses = result.value.courses;

  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Course Catalog</h1>
        <p className={styles.heroSubtitle}>
          Expert-led Amazon FBA training, taught in Filipino. Learn at your own pace.
        </p>
      </section>

      {/* Grid */}
      <section className={styles.gridSection}>
        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Courses coming soon.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {courses.map((catalogCourse: CatalogCourse) => (
              <CourseCard key={catalogCourse.course.id} catalogCourse={catalogCourse} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CourseCard({ catalogCourse }: { catalogCourse: CatalogCourse }) {
  const { course, lessonCount, estimatedMinutes } = catalogCourse;
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  const priceDisplay = course.price.minor === 0 ? "FREE" : course.price.format();

  return (
    <Link href={`/courses/${course.slug}`} className={styles.card}>
      {course.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.coverImage} alt={course.title} className={styles.cardImage} />
      ) : (
        <div className={styles.cardImagePlaceholder}>
          <span className={styles.cardImagePlaceholderLetter}>{course.title[0]}</span>
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{course.title}</h2>
          <span className={styles.cardPrice}>{priceDisplay}</span>
        </div>

        {course.tagline && <p className={styles.cardTagline}>{course.tagline}</p>}

        <div className={styles.cardMeta}>
          <span>
            {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
          </span>
          {estimatedMinutes > 0 && (
            <span>
              {hours > 0 ? `${hours}h ` : ""}
              {minutes}m video
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
