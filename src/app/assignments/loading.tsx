/**
 * /assignments loading skeleton (P1-02).
 */

import { SkeletonCard } from "@/components/ui/Skeleton";

export default function AssignmentsLoading() {
  return (
    <main aria-busy="true">
      <SkeletonCard />
    </main>
  );
}
