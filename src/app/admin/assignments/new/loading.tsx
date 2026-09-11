/**
 * /admin/assignments/new loading skeleton (P1-02).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function NewAssignmentLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm />
    </main>
  );
}
