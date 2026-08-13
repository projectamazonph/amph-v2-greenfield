import Link from "next/link";
import { redirect } from "next/navigation";
import { QuizPlayer } from "@/components/courses/QuizPlayer";
import { CourseAccessNotice } from "@/components/student/CourseAccessNotice";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import styles from "../../lessons/[lessonId]/quiz/page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; quizId: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { slug, quizId } = await params;
  const user = await getSessionUser();
  const returnPath = `/courses/${slug}/quizzes/${quizId}`;
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }

  const container = buildContainer();
  const [courseResult, quizResult] = await Promise.all([
    container.getCatalogCourse.execute(slug),
    container.quizRepo.findById(quizId),
  ]);

  if (!courseResult.ok) {
    if (courseResult.error.kind === "not_found") {
      return <NotFoundMessage slug={slug} />;
    }
    throw new Error("Failed to load course");
  }
  if (!quizResult.ok) {
    throw new Error("Failed to load quiz");
  }
  if (!quizResult.value || quizResult.value.courseId !== courseResult.value.courseId) {
    return <NotFoundMessage slug={slug} />;
  }

  const accessResult = await container.checkCourseAccess.execute({
    userId: user.id,
    courseId: courseResult.value.courseId,
  });
  if (!accessResult.ok) {
    const reason = accessResult.error.reason;
    return (
      <CourseAccessNotice
        courseSlug={slug}
        courseTitle={courseResult.value.title}
        feature="quiz"
        reason={
          reason === "tier"
            ? "plan_required"
            : reason === "not_enrolled"
              ? "enrollment_required"
              : "verification_unavailable"
        }
        signedIn
        userTier={accessResult.error.tier}
        requiredTier={accessResult.error.requiredTier}
      />
    );
  }

  if (accessResult.value.kind !== "allowed") {
    return (
      <CourseAccessNotice
        courseSlug={slug}
        courseTitle={courseResult.value.title}
        feature="quiz"
        reason="preview_limit"
        signedIn
      />
    );
  }

  const quiz = quizResult.value;
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={`/courses/${slug}`}>← Back to course</Link>
      </nav>
      <QuizPlayer
        quizId={quiz.id}
        title={quiz.title}
        passingScore={quiz.passingScore}
        questions={quiz.questions.map((question) => ({
          id: question.id,
          questionText: question.questionText,
          options: question.options.map((option) => ({
            id: option.id,
            optionText: option.optionText,
          })),
        }))}
      />
    </main>
  );
}

function NotFoundMessage({ slug }: { slug: string }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Quiz not found</h1>
      <p>This quiz is not available for the selected course.</p>
      <Link href={`/courses/${slug}`}>Back to course</Link>
    </main>
  );
}
