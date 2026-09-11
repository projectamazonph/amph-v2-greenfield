/**
 * /admin/courses/[id]/prerequisites loading skeleton (P1-01).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function CoursePrerequisitesLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm />
    </main>
  );
}
