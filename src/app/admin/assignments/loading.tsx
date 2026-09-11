/**
 * /admin/assignments loading skeleton (P1-02).
 */

import { SkeletonTable } from "@/components/ui/Skeleton";

export default function AssignmentsLoading() {
  return (
    <main aria-busy="true">
      <SkeletonTable />
    </main>
  );
}
