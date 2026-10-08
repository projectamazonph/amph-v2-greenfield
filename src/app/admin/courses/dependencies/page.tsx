/**
 * /admin/courses/dependencies — global module dependency matrix.
 *
 * STORY-108 gap closure (t_94861779).
 * Server component. Gated by `requireAdmin`.
 */

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { ModuleDependencyMatrix } from "@/components/admin/ModuleDependencyMatrix";
import { Card } from "@astryxdesign/core";

export default async function GlobalCourseDependenciesPage() {
  await requireAdmin();

  const container = buildContainer();
  const matrixResult = await container.getModuleDependencyMatrix.execute({});

  if (!matrixResult.ok) {
    redirect("/admin/courses");
  }

  return (
    <div>
      <AdminSubPageHeader
        title="Curriculum Module Dependency Matrix"
        subtitle="Visualizes prerequisite and dependency edges across all courses and modules"
        backHref="/admin/courses"
        backLabel="Back to courses"
      />

      <Card padding={6}>
        <ModuleDependencyMatrix data={matrixResult.value} />
      </Card>
    </div>
  );
}
