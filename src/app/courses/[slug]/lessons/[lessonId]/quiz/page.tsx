/**
 * /courses/[slug]/lessons/[lessonId]/quiz: student-facing quiz player.
 *
 * Wireframe: docs/ui-specs/wireframes/student/quiz.html
 *
 * Loads the Quiz entity treating the lessonId as the quizId, which only
 * resolves when a lesson id happens to equal a quiz id. The course-scoped
 * /courses/[slug]/quizzes/[quizId] route is the reliable entry point;
 * this one is kept because QUIZ lessons deep-link to it.
 *
 * Auth: /proxy.ts does NOT protect /courses, so this page does its own
 * gating. It mirrors the course-scoped route: signed in, plus an active
 * enrollment or an admin role. Quiz attempts award XP, so letting an
 * unenrolled reader through would hand out progress for a course they
 * do not own.
 */

import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { courseIsAvailable } from "@/domain/entities/Course";
import { QuizPlayer } from "@/components/courses/QuizPlayer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className={styles.page}>
        <p>Sign in to take this quiz.</p>
      </main>
    );
  }

  const container = buildContainer();
  const quizResult = await container.quizRepo.findById(lessonId);
  if (!Result.isOk(quizResult) || !quizResult.value) {
    // A Quiz has a courseId, not a lessonId, so this route only resolves
    // when a lesson id happens to equal a quiz id. Point the student at
    // the course page, which lists every knowledge check for the course,
    // instead of dead-ending on "not found".
    return (
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <a href={`/courses/${slug}/lessons/${lessonId}`}>← Back to lesson</a>
        </nav>
        <h1 className={styles.title}>Quiz not found</h1>
        <p>
          This lesson does not have its own quiz. The knowledge checks for this course are listed on{" "}
          <a href={`/courses/${slug}`}>the course page</a>.
        </p>
      </main>
    );
  }

  const quiz = quizResult.value;

  // Access gate, mirroring /courses/[slug]/quizzes/[quizId]. Resolve the
  // course from the URL and require the quiz to belong to it, so this
  // route cannot serve another course's quiz under this breadcrumb.
  const courseResult = await container.courseRepo.findBySlug(slug);
  if (
    !Result.isOk(courseResult) ||
    !courseIsAvailable(courseResult.value) ||
    courseResult.value.id !== quiz.courseId
  ) {
    return (
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <a href={`/courses/${slug}`}>← Back to course</a>
        </nav>
        <h1 className={styles.title}>Quiz not found</h1>
        <p>This quiz is not part of this course.</p>
      </main>
    );
  }
  const course = courseResult.value;

  const enrollment = await container.enrollmentRepo.findByUserIdAndCourseId(user.id, course.id);
  const isEnrolled = enrollment !== null && enrollment.status === "active";
  if (!isEnrolled && user.role !== "ADMIN") {
    return (
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <a href={`/courses/${slug}`}>← Back to course</a>
        </nav>
        <h1 className={styles.title}>Enroll to take this quiz</h1>
        <p>
          This knowledge check is part of <strong>{course.title}</strong>.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href={`/courses/${slug}/lessons/${lessonId}`}>← Back to lesson</a>
      </nav>
      <QuizPlayer
        quizId={quiz.id}
        title={quiz.title}
        passingScore={quiz.passingScore}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options.map((o) => ({ id: o.id, optionText: o.optionText })),
        }))}
      />
    </main>
  );
}
