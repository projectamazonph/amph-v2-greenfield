/**
 * /admin/assignments/[id] loading skeleton (P1-02).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function AssignmentDetailLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm />
    </main>
  );
}
