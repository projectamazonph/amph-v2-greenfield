/**
 * /admin/assignments/new — assign work to a student (P1-02).
 *
 * Server component. Loads the course dropdown options, then hands
 * the form to the client component posting to
 * `createAssignmentAction`.
 */

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { Card } from "@astryxdesign/core";
import { NewAssignmentForm } from "./NewAssignmentForm";
import styles from "../page.module.css";

export default async function NewAssignmentPage() {
  await requireAdmin();

  const container = buildContainer();
  const coursesResult = await container.adminListCourses.execute({ page: 1, pageSize: 100 });
  if (!coursesResult.ok) {
    redirect("/admin/assignments");
  }

  const courses = coursesResult.value.courses.map((course) => ({
    id: course.id,
    title: course.title,
  }));

  return (
    <div>
      <AdminSubPageHeader
        title="Assign work"
        backHref="/admin/assignments"
        backLabel="Back to assignments"
        subtitle="The student sees this on their assignments page"
      />

      <Card padding={6}>
        <NewAssignmentForm courses={courses} />
      </Card>
    </div>
  );
}
