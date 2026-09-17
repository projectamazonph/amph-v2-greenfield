/**
 * /admin/maintenance loading skeleton (UI polish pass).
 */

import { SkeletonForm } from "@/components/ui/Skeleton";

export default function MaintenanceLoading() {
  return (
    <main aria-busy="true">
      <SkeletonForm fields={2} />
    </main>
  );
}
