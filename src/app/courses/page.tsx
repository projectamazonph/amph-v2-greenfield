/**
 * /courses — AMPH Course Catalog
 * Story 016
 */

import Link from "next/link";
import type { Metadata } from "next";
import { ListCourses } from "@/usecases/ListCourses";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import type { Course } from "@/domain/entities/Course";

export const metadata: Metadata = {
  title: "Courses — AMPH Academy",
  description: "Expert-led Amazon FBA courses taught in Filipino.",
};

export default async function CoursesPage() {
  const repo = new InMemoryCourseRepository();
  const useCase = new ListCourses(repo);
  const result = await useCase.execute();

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Unable to load courses. Please try again later.</p>
      </main>
    );
  }

  const courses = result.courses;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <section className="bg-[var(--surface)] border-b border-[var(--border)] py-16 px-6 text-center">
        <h1 className="text-4xl font-bold text-[var(--text)] mb-3">Course Catalog</h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          Expert-led Amazon FBA training, taught in Filipino. Learn at your own pace.
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--text-secondary)]">Courses coming soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)] transition-colors duration-200"
    >
      {course.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.coverImage} alt={course.title} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center">
          <span className="text-white text-3xl font-bold opacity-30">{course.title[0]}</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
            {course.title}
          </h2>
          <span className="text-sm font-bold text-[var(--accent)] whitespace-nowrap">
            {priceDisplay}
          </span>
        </div>

        {course.tagline && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
            {course.tagline}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span>{lessonCount} lesson{lessonCount !== 1 ? "s" : ""}</span>
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
