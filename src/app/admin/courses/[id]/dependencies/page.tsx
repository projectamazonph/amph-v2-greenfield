/**
 * /admin/courses/[id]/dependencies — course module dependency matrix.
 *
 * STORY-108 gap closure (t_94861779).
 * Server component. Loads the course and matrix data from container,
 * gated by `requireAdmin`.
 */

import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { ModuleDependencyMatrix } from "@/components/admin/ModuleDependencyMatrix";
import { Card } from "@astryxdesign/core";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDependenciesPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const courseResult = await container.adminGetCourse.execute({ courseId: id });
  if (!courseResult.ok) {
    if (courseResult.error.kind === "course_not_found") {
      notFound();
    }
    redirect("/admin/courses");
  }
  const course = courseResult.value.course;

  const matrixResult = await container.getModuleDependencyMatrix.execute({ courseId: id });
  if (!matrixResult.ok) {
    redirect(`/admin/courses/${id}`);
  }

  return (
    <div>
      <AdminSubPageHeader
        title={`Module Dependency Matrix: ${course.title}`}
        subtitle="Prerequisite relationships between modules across all courses"
        backHref={`/admin/courses/${id}`}
        backLabel="Back to course"
      />

      <Card padding={6}>
        <ModuleDependencyMatrix data={matrixResult.value} courseId={id} />
      </Card>
    </div>
  );
}
