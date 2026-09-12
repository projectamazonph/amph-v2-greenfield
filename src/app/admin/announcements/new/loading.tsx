/**
 * /admin/announcements/new loading skeleton (UI polish pass).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function NewAnnouncementLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm fields={5} />
    </main>
  );
}
