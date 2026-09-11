/**
 * /admin/assignments/new — assign work to a student (P1-02).
 *
 * Server component. Loads the course dropdown options, then hands
 * the form to the client component posting to
 * `createAssignmentAction`.
 */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
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
      <Link href="/admin/assignments" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to assignments
      </Link>

      <TopBar
        title="Assign work"
        subtitle="The student sees this on their assignments page"
      />

      <Card padding={6}>
        <NewAssignmentForm courses={courses} />
      </Card>
    </div>
  );
}
