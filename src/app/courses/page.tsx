/**
 * /courses — AMPH Course Catalog
 * Story 016
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 *
 * Uses buildContainer() (the composition root) for the course
 * repository + ListCourses use case. The page MUST NOT
 * instantiate InMemory* adapters directly — that would be the
 * "in-memory in production" anti-pattern (the catalog would
 * always be empty).
 */

import Link from "next/link";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import type { Course } from "@/domain/entities/Course";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Courses — AMPH Academy",
  description: "Expert-led Amazon FBA courses taught in Filipino.",
};

export default async function CoursesPage() {
  const container = buildContainer();
  const result = await container.listCourses.execute();

  if (!result.ok) {
    return (
      <main className={styles.errorPage}>
        <p className={styles.errorText}>
          Unable to load courses. Please try again later.
        </p>
      </main>
    );
  }

  const courses = result.courses;

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
            {courses.map((course: Course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CourseCard({ course }: { course: Course }) {
  const lessonCount = courseLessonCount(course);
  const totalMinutes = courseTotalDurationMinutes(course);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const priceDisplay = course.price.minor === 0 ? "FREE" : course.price.format();

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={styles.card}
    >
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

        {course.tagline && (
          <p className={styles.cardTagline}>{course.tagline}</p>
        )}

        <div className={styles.cardMeta}>
          <span>
            {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
          </span>
          {totalMinutes > 0 && (
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
