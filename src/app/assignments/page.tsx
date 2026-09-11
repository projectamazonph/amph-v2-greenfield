/**
 * /assignments — the student's work queue (P1-02).
 *
 * Server component. Lists the student's assignments with due dates,
 * overdue highlight, grades and feedback, and a submit button on
 * PENDING rows. Enforcement lives in `SubmitAssignment`; this page
 * only displays.
 */

import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import { Card, Badge } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import { SubmitAssignmentButton } from "./SubmitAssignmentButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await requireAuth();
  const container = buildContainer();
  const result = await container.listStudentAssignments.execute({ userId: user.id });

  if (!result.ok) {
    return (
      <StudentShell user={user}>
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <header className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Your work</span>
              <h1 className={styles.title}>Assignments</h1>
            </div>
          </header>
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty} role="alert">
                We could not load your assignments right now. Nothing is lost.
                Refresh to try again.
              </p>
              <Link href="/dashboard" className={styles.stateLink}>
                Return to dashboard
              </Link>
            </div>
          </Card>
        </main>
      </StudentShell>
    );
  }

  const { rows } = result.value;

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Your work</span>
            <h1 className={styles.title}>Assignments</h1>
            <p className={styles.subtitle}>
              Work your instructor assigned. Submit when it is done; late
              work still counts.
            </p>
          </div>
        </header>

        {rows.length === 0 ? (
          <Card padding={6}>
            <p className={styles.empty} role="status">
              Nothing assigned yet. New work from your instructor shows up here.
            </p>
          </Card>
        ) : (
          <ul className={styles.list}>
            {rows.map(({ assignment, overdue }) => (
              <li key={assignment.id}>
                <Card padding={6}>
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardTitle}>{assignment.title}</h2>
                    <Badge
                      variant="neutral"
                      label={
                        assignment.status === "GRADED"
                          ? `Graded ${assignment.grade}/100`
                          : overdue
                            ? "Overdue"
                            : assignment.status === "SUBMITTED"
                              ? "Submitted"
                              : "Pending"
                      }
                    />
                  </div>
                  <p className={styles.description}>{assignment.description}</p>
                  <p className={styles.meta}>
                    Due {assignment.dueAt.toLocaleDateString("en-PH")}
                    {assignment.submittedAt &&
                      ` · Submitted ${assignment.submittedAt.toLocaleDateString("en-PH")}`}
                  </p>
                  {assignment.feedback && (
                    <p className={styles.feedback}>
                      <strong>Feedback:</strong> {assignment.feedback}
                    </p>
                  )}
                  {assignment.status === "PENDING" && (
                    <SubmitAssignmentButton assignmentId={assignment.id} />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </StudentShell>
  );
}
