import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { QuizPlayer } from "@/components/courses/QuizPlayer";
import { CourseAccessNotice } from "@/components/student/CourseAccessNotice";
import { StudentShell } from "@/components/student/StudentShell";
import { isModuleComplete, orderLearnerModules } from "@/domain/curriculum/GuidedFlow";
import { EmptyState } from "@/components/ui/EmptyState";
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
      return (
        <StudentShell user={user}>
          <NotFoundMessage slug={slug} />
        </StudentShell>
      );
    }
    throw new Error("Failed to load course");
  }
  if (!quizResult.ok) {
    throw new Error("Failed to load quiz");
  }
  if (!quizResult.value || quizResult.value.courseId !== courseResult.value.courseId) {
    return (
      <StudentShell user={user}>
        <NotFoundMessage slug={slug} />
      </StudentShell>
    );
  }

  const accessResult = await container.checkCourseAccess.execute({
    userId: user.id,
    courseId: courseResult.value.courseId,
  });
  if (!accessResult.ok) {
    const reason = accessResult.error.reason;
    return (
      <StudentShell user={user}>
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
      </StudentShell>
    );
  }

  if (accessResult.value.kind !== "allowed") {
    return (
      <StudentShell user={user}>
        <CourseAccessNotice
          courseSlug={slug}
          courseTitle={courseResult.value.title}
          feature="quiz"
          reason="preview_limit"
          signedIn
        />
      </StudentShell>
    );
  }

  const quiz = quizResult.value;
  const course = courseResult.value;
  const enrollment = await container.enrollmentRepo?.findByUserIdAndCourseId(
    user.id,
    course.courseId,
  );
  const completedLessonIds = enrollment?.status === "active" ? enrollment.completedLessonIds : [];
  const guidedModule = Array.isArray(course.modules)
    ? orderLearnerModules(course.modules).find((candidate) =>
        quizBelongsToModule(quiz.title, candidate.title),
      )
    : undefined;
  if (
    guidedModule &&
    !isModuleComplete(
      [{ id: guidedModule.id, title: guidedModule.title, lessons: guidedModule.lessons }],
      completedLessonIds,
    )
  ) {
    return (
      <StudentShell user={user}>
        <CourseAccessNotice
          courseSlug={slug}
          courseTitle={course.title}
          feature="quiz"
          reason="prerequisite"
          previousLessonTitle={guidedModule.lessons[guidedModule.lessons.length - 1]?.title}
          signedIn
        />
      </StudentShell>
    );
  }
  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={`/courses/${slug}`} className={styles.crumbLink}>
            <ArrowLeft size={16} aria-hidden /> {course.title}
          </Link>
          <span className={styles.crumbSep} aria-hidden="true">
            /
          </span>
          <span className={styles.crumbCurrent} aria-current="page">
            {quiz.title}
          </span>
        </nav>
        <QuizPlayer
          quizId={quiz.id}
          title={quiz.title}
          passingScore={quiz.passingScore}
          courseHref={`/courses/${slug}`}
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
    </StudentShell>
  );
}

function quizBelongsToModule(quizTitle: string, moduleTitle: string): boolean {
  const quiz = quizTitle.toLowerCase();
  const moduleLabel = moduleTitle.toLowerCase();
  const aliases: Record<string, string[]> = {
    onboarding: ["onboarding"],
    foundations: ["foundations"],
    "keyword research": ["keyword research"],
    "listing optimization": ["listing optimization"],
    "campaign architecture": ["campaign architecture"],
    "portfolio strategy": ["portfolio strategy"],
    "bidding lab": ["bidding lab"],
    "search term triage": ["search term triage"],
    "competitive intelligence": ["competitive intelligence"],
    "weekly optimization": ["weekly optimization"],
    "reporting troubleshooting": ["reporting and troubleshooting", "reporting troubleshooting"],
    "va workflow capstone": ["va workflow and capstone", "va workflow capstone"],
  };
  const key = Object.keys(aliases).find((candidate) => moduleLabel.includes(candidate));
  return key ? aliases[key]!.some((alias) => quiz.includes(alias)) : quiz.includes(moduleLabel);
}

function NotFoundMessage({ slug }: { slug: string }) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <EmptyState
        headingLevel="h2"
        title="Quiz not found"
        description="This quiz is not available for the selected course."
        action={<Link href={`/courses/${slug}`}>Back to course</Link>}
      />
    </main>
  );
}
