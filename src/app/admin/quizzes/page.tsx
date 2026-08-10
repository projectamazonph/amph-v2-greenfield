/**
 * /admin/quizzes — admin quiz list.
 *
 * STORY-091 (US-006). Server component. Calls requireAdmin() first
 * (the layout also does, but the explicit call makes the page's
 * gating intent obvious). The list comes from AdminListQuizzes which
 * batch-hydrates the parent courses.
 */
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { AdminQuizzesTable, type QuizRow } from "@/components/admin/AdminQuizzesTable";
import styles from "./page.module.css";

export default async function QuizzesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListQuizzes.execute({});
  if (!r.ok) {
    return (
      <div>
        <TopBar title="Quizzes" subtitle="Manage quiz content for each course" />
        <Card padding={6}>
          <p className={styles.error}>Quizzes could not be loaded. Try again.</p>
        </Card>
      </div>
    );
  }
  const quizzes = r.value.quizzes;
  const courses = r.value.courses;

  // Map domain Quiz[] → QuizRow[] (plain serializable for client component)
  const rows: QuizRow[] = quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    courseId: q.courseId,
    courseTitle: courses.get(q.courseId)?.title ?? "(missing)",
    passingScore: q.passingScore,
    questionCount: q.questions.length,
  }));

  return (
    <div>
      <TopBar
        title="Quizzes"
        subtitle="Manage quiz content for each course"
        actions={
          <Link href="/admin/quizzes/new" className={styles.addButton}>
            + Add quiz
          </Link>
        }
      />

      <Card padding={6}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No quizzes have been created yet.</p>
            <Link href="/admin/quizzes/new" className={styles.emptyAction}>
              Create the first quiz
            </Link>
          </div>
        ) : (
          <AdminQuizzesTable quizzes={rows} />
        )}
      </Card>
    </div>
  );
}
