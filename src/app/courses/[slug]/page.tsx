/**
 * /courses/[slug] — AMPH Course Detail
 * Story 017
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GetCourse } from "@/usecases/GetCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import type { Course, Section, Lesson } from "@/domain/entities/Course";
import { EnrollButton } from "./EnrollButton";

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
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 transition-colors"
          >
            ← Back to Courses
          </Link>

          <div className="flex flex-col md:flex-row md:items-start gap-8">
            {/* Cover */}
            {course.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverImage}
                alt={course.title}
                className="w-full md:w-72 h-48 object-cover rounded-xl flex-shrink-0"
              />
            ) : (
              <div className="w-full md:w-72 h-48 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] rounded-xl flex-shrink-0 flex items-center justify-center">
                <span className="text-white text-5xl font-bold opacity-30">{course.title[0]}</span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--text)] mb-2">{course.title}</h1>
              {course.tagline && (
                <p className="text-lg text-[var(--accent)] mb-3">{course.tagline}</p>
              )}
              <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)] mb-6">
                <span className="flex items-center gap-1">
                  <BookIcon /> {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1">
                    <ClockIcon /> {hours > 0 ? `${hours}h ` : ""}{minutes}m video
                  </span>
                )}
                <span className="font-bold text-[var(--text)] text-lg">{priceDisplay}</span>
              </div>

              <EnrollButton courseId={course.id} priceMinor={course.price.minor} />
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-6">Curriculum</h2>
        <div className="space-y-6">
          {course.curriculum.sections.map((section: Section, si: number) => (
            <details key={section.id} className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden" open={si === 0}>
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 hover:bg-[var(--bg)] transition-colors select-none list-none">
                <span className="font-medium text-[var(--text)]">
                  Section {si + 1}: {section.title}
                </span>
                <span className="text-[var(--text-secondary)] text-sm group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <ul className="border-t border-[var(--border)]">
                <LessonList lessons={section.lessons as readonly Lesson[]} courseSlug={course.slug} />
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LessonList({ lessons, courseSlug }: { lessons: readonly Lesson[]; courseSlug: string }) {
  const items: React.ReactNode[] = [];
  for (let i = 0; i < lessons.length; i++) {
    const lessonItem = lessons[i];
    if (!lessonItem) continue;
    const vid = lessonItem.type === "VIDEO" && lessonItem.content && typeof lessonItem.content === "object" && "durationMinutes" in lessonItem.content
      ? String((lessonItem.content as { durationMinutes: number }).durationMinutes) + "m"
      : null;
    items.push(
      <li
        key={lessonItem.id}
        className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] last:border-0"
      >
        <LessonTypeIcon type={lessonItem.type} />
        <Link
          href={`/courses/${courseSlug}/lessons/${lessonItem.id}`}
          className="flex-1 hover:text-[var(--text)] transition-colors"
        >
          {lessonItem.title}
        </Link>
        {vid && <span className="ml-auto text-xs opacity-60">{vid}</span>}
      </li>,
    );
  }
  return <>{items}</>;
}

function LessonTypeIcon({ type }: { type: string }) {
  if (type === "VIDEO") {
    return (
      <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (type === "QUIZ") {
    return (
      <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
