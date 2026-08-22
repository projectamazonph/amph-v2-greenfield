/**
 * /admin/simulators/[id]/[scenarioKey]/calibration — loading state.
 */

import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      <Skeleton variant="text" width={200} />
      <Skeleton variant="text" width={400} style={{ marginTop: "var(--space-2)" }} />
      <div style={{ marginTop: "var(--space-6)" }}>
        <Skeleton variant="rectangular" height={200} />
      </div>
    </div>
  );
}
