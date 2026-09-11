/**
 * /admin/courses/[id]/prerequisites — manage course gates (P1-01).
 *
 * Server component. Loads the course, its live prerequisite rules,
 * and every other course (for the add-form dropdowns), then hands
 * plain data to the client manager form. Gated by `requireAdmin`.
 */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { PrerequisiteManager } from "./PrerequisiteManager";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; removed?: string }>;
}

export default async function CoursePrerequisitesPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const courseResult = await container.adminGetCourse.execute({ courseId: id });
  if (!courseResult.ok) {
    if (courseResult.error.kind === "course_not_found") {
      notFound();
    }
    redirect("/admin/courses");
  }
  const course = courseResult.value.course;

  const [rulesResult, coursesResult] = await Promise.all([
    container.prerequisiteRepo.listByCourseId(id),
    container.adminListCourses.execute({ page: 1, pageSize: 100 }),
  ]);
  if (!rulesResult.ok || !coursesResult.ok) {
    redirect("/admin/courses");
  }

  const byId = new Map(coursesResult.value.courses.map((c) => [c.id, c]));
  const rules = rulesResult.value.map((rule) => {
    const required = byId.get(rule.requiresCourseId);
    const lessonTitle =
      rule.requiresLessonId !== null
        ? (required?.curriculum.sections
            .flatMap((section) => section.lessons)
            .find((lesson) => lesson.id === rule.requiresLessonId)?.title ?? rule.requiresLessonId)
        : null;
    return {
      courseId: rule.courseId,
      requiresCourseId: rule.requiresCourseId,
      requiresLessonId: rule.requiresLessonId,
      requiresCourseTitle: required?.title ?? rule.requiresCourseId,
      requiresLessonTitle: lessonTitle,
    };
  });

  const otherCourses = coursesResult.value.courses
    .filter((c) => c.id !== id)
    .map((c) => ({
      id: c.id,
      title: c.title,
      lessons: c.curriculum.sections.flatMap((section) =>
        section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
      ),
    }));

  const sp = await searchParams;
  const notice = sp.saved === "1" ? "Rule saved." : sp.removed === "1" ? "Rule removed." : null;

  return (
    <div>
      <Link href={`/admin/courses/${id}`} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to course
      </Link>

      <TopBar
        title={`Prerequisites: ${course.title}`}
        subtitle="Students must finish these before they can enroll"
      />

      {notice && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p className={styles.notice} role="status">
            {notice}
          </p>
        </Card>
      )}

      <Card padding={6}>
        <PrerequisiteManager courseId={id} rules={rules} otherCourses={otherCourses} />
      </Card>
    </div>
  );
}
