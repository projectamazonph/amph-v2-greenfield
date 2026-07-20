/**
 * /courses/[slug]/lessons/[lessonId]/quiz — student-facing quiz player.
 *
 * Wireframe: docs/ui-specs/wireframes/student/quiz.html
 *
 * Loads the Quiz entity (treating the lessonId as the quizId —
 * the API at /api/quizzes/[quizId]/attempt uses the same id).
 * Renders the question, the 3 options, and a Submit button.
 * On submit, calls the /api/quizzes/[quizId]/attempt endpoint
 * via a client form and shows the result.
 *
 * Auth: the /proxy.ts already redirects unauthenticated users
 * away from /courses to /login. We assume getSessionUser() works.
 */

import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
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
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Quiz not found</h1>
        <p>This lesson does not have a quiz.</p>
      </main>
    );
  }

  const quiz = quizResult.value;
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
