/**
 * /courses/[slug] — AMPH Course Detail
 * Story 017
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GetCourse } from "@/usecases/GetCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import type { Course, Section, Lesson } from "@/domain/entities/Course";
import { EnrollButton } from "./EnrollButton";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const repo = new InMemoryCourseRepository();
  const useCase = new GetCourse(repo);
  const result = await useCase.execute(slug);
  if (!result.ok) return { title: "Course Not Found — AMPH Academy" };
  const course = result.course;
  return {
    title: `${course.title} — AMPH Academy`,
    description: course.tagline || course.description.slice(0, 160),
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const repo = new InMemoryCourseRepository();
  const useCase = new GetCourse(repo);
  const result = await useCase.execute(slug);

  if (!result.ok) notFound();

  const course = result.course;
  const lessonCount = courseLessonCount(course);
  const totalMinutes = courseTotalDurationMinutes(course);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const priceDisplay = course.price.minor === 0 ? "FREE" : course.price.format();

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/courses" className={styles.backLink}>
            ← Back to Courses
          </Link>

          <div className={styles.headerGrid}>
            {/* Cover */}
            {course.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverImage}
                alt={course.title}
                className={styles.cover}
              />
            ) : (
              <div className={styles.coverPlaceholder}>
                <span className={styles.coverPlaceholderLetter}>{course.title[0]}</span>
              </div>
            )}

            <div className={styles.headerBody}>
              <h1 className={styles.title}>{course.title}</h1>
              {course.tagline && (
                <p className={styles.tagline}>{course.tagline}</p>
              )}
              <p className={styles.description}>{course.description}</p>

              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <BookIcon /> {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                </span>
                {totalMinutes > 0 && (
                  <span className={styles.metaItem}>
                    <ClockIcon /> {hours > 0 ? `${hours}h ` : ""}
                    {minutes}m video
                  </span>
                )}
                <span className={styles.price}>{priceDisplay}</span>
              </div>

              <EnrollButton courseId={course.id} priceMinor={course.price.minor} />
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className={styles.curriculumSection}>
        <h2 className={styles.curriculumTitle}>Curriculum</h2>
        <div className={styles.sectionList}>
          {course.curriculum.sections.map((section: Section, si: number) => (
            <details
              key={section.id}
              className={styles.section}
              open={si === 0}
            >
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>
                  Section {si + 1}: {section.title}
                </span>
                <span className={styles.sectionChevron}>▼</span>
              </summary>
              <ul className={styles.lessonList}>
                <LessonList
                  lessons={section.lessons as readonly Lesson[]}
                  courseSlug={course.slug}
                />
              </ul>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}

function BookIcon() {
  return (
    <svg
      className={styles.metaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className={styles.metaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LessonList({
  lessons,
  courseSlug,
}: {
  lessons: readonly Lesson[];
  courseSlug: string;
}) {
  const items: React.ReactNode[] = [];
  for (let i = 0; i < lessons.length; i++) {
    const lessonItem = lessons[i];
    if (!lessonItem) continue;
    const vid =
      lessonItem.type === "VIDEO" &&
      lessonItem.content &&
      typeof lessonItem.content === "object" &&
      "durationMinutes" in lessonItem.content
        ? String((lessonItem.content as { durationMinutes: number }).durationMinutes) + "m"
        : null;
    items.push(
      <li key={lessonItem.id} className={styles.lessonItem}>
        <LessonTypeIcon type={lessonItem.type} />
        <Link
          href={`/courses/${courseSlug}/lessons/${lessonItem.id}`}
          className={styles.lessonLink}
        >
          {lessonItem.title}
        </Link>
        {vid && <span className={styles.lessonDuration}>{vid}</span>}
      </li>,
    );
  }
  return <>{items}</>;
}

function LessonTypeIcon({ type }: { type: string }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "aria-hidden": "true",
    className: styles.lessonIcon,
  } as const;
  if (type === "VIDEO") {
    return (
      <svg {...commonProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (type === "QUIZ") {
    return (
      <svg {...commonProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
