/**
 * /admin/assignments/[id] — assignment detail + grade form (P1-02).
 *
 * Server component. Shows the work description, the student, the
 * timeline, and the grade form when the row is SUBMITTED.
 */

import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { Card } from "@astryxdesign/core";
import { GradeAssignmentForm } from "./GradeAssignmentForm";
import styles from "../page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const found = await container.assignmentRepo.findById(id);
  if (!found.ok) {
    redirect("/admin/assignments");
  }
  if (found.value === null) {
    notFound();
  }
  const assignment = found.value;

  const [userResult, courseResult] = await Promise.all([
    container.userRepo.findById(assignment.userId),
    container.courseRepo.findById(assignment.courseId),
  ]);
  const studentEmail = userResult.ok ? userResult.value.email : assignment.userId;
  const courseTitle = courseResult.ok ? courseResult.value.title : assignment.courseId;

  return (
    <div>
      <AdminSubPageHeader
        title={assignment.title}
        backHref="/admin/assignments"
        backLabel="Back to assignments"
        subtitle={`${studentEmail} · ${courseTitle}`}
      />

      <Card padding={6} style={{ marginBottom: "1rem" }}>
        <dl className={styles.detailList}>
          <div>
            <dt>Status</dt>
            <dd>{assignment.status}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>{assignment.dueAt.toLocaleString("en-PH")}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{assignment.submittedAt?.toLocaleString("en-PH") ?? "-"}</dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{assignment.grade === null ? "-" : `${assignment.grade}/100`}</dd>
          </div>
          {assignment.feedback && (
            <div>
              <dt>Feedback</dt>
              <dd>{assignment.feedback}</dd>
            </div>
          )}
        </dl>
        <h2 className={styles.sectionTitle}>The work</h2>
        <p className={styles.description}>{assignment.description}</p>
      </Card>

      {assignment.status === "SUBMITTED" && (
        <Card padding={6}>
          <GradeAssignmentForm assignmentId={assignment.id} />
        </Card>
      )}
    </div>
  );
}
