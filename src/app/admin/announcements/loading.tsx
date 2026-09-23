/**
 * /admin/announcements loading skeleton (UI polish pass).
 */

import { SkeletonTable } from "@/components/ui/Skeleton";

export default function AnnouncementsLoading() {
  return (
    <main aria-busy="true">
      <SkeletonTable columns={5} rows={4} />
    </main>
  );
}
