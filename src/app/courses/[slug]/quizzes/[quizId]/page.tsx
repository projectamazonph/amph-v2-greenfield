/**
 * /courses/[slug]/quizzes/[quizId]: student-facing quiz player.
 *
 * A Quiz belongs to a Course (`Quiz.courseId`); it has no lesson or
 * module foreign key. The pre-existing
 * /courses/[slug]/lessons/[lessonId]/quiz route looked a quiz up by
 * lesson id, so it only ever resolved if a lesson id happened to equal
 * a quiz id, which no seeded content does. This route keys on the id
 * the data model actually has, so the seeded knowledge checks are
 * reachable.
 *
 * Access mirrors the lesson page: AuthorizeLessonAccess is per-lesson
 * and does not apply here, so the gate is "signed in with an active
 * enrollment, or an admin". Quiz attempts award XP, so an anonymous
 * attempt has nowhere to go.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { courseIsAvailable } from "@/domain/entities/Course";
import { QuizPlayer } from "@/components/courses/QuizPlayer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; quizId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId } = await params;
  const container = buildContainer();
  const quizResult = await container.quizRepo.findById(quizId);
  if (!Result.isOk(quizResult) || !quizResult.value) {
    return { title: "Quiz Not Found — Project Amazon PH Academy" };
  }
  return { title: `${quizResult.value.title} — Project Amazon PH Academy` };
}

export default async function CourseQuizPage({ params }: Props) {
  const { slug, quizId } = await params;
  const container = buildContainer();

  // ── Course ──────────────────────────────────────────────
  const courseResult = await container.courseRepo.findBySlug(slug);
  if (!Result.isOk(courseResult) || !courseIsAvailable(courseResult.value)) {
    notFound();
  }
  const course = courseResult.value;

  // ── Quiz, scoped to this course ─────────────────────────
  // The courseId check stops /courses/<any-slug>/quizzes/<id> from
  // serving another course's quiz under the wrong breadcrumb.
  const quizResult = await container.quizRepo.findById(quizId);
  if (!Result.isOk(quizResult) || !quizResult.value || quizResult.value.courseId !== course.id) {
    notFound();
  }
  const quiz = quizResult.value;

  // ── Auth ────────────────────────────────────────────────
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Sign in to take this quiz</h1>
        <p className={styles.body}>
          Quiz attempts are saved to your account, so you need to be signed in.
        </p>
        <Link href={`/login?redirect=/courses/${slug}/quizzes/${quizId}`} className={styles.cta}>
          Sign in
        </Link>
      </main>
    );
  }

  const enrollment = await container.enrollmentRepo.findByUserIdAndCourseId(user.id, course.id);
  const isEnrolled = enrollment !== null && enrollment.status === "active";
  if (!isEnrolled && user.role !== "ADMIN") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Enroll to take this quiz</h1>
        <p className={styles.body}>
          This knowledge check is part of <strong>{course.title}</strong>.
        </p>
        <Link href={`/courses/${slug}`} className={styles.cta}>
          View course
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={`/courses/${slug}`}>← {course.title}</Link>
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
