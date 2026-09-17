/**
 * /admin/announcements/[id]/edit loading skeleton (UI polish pass).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function EditAnnouncementLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm fields={5} />
    </main>
  );
}
