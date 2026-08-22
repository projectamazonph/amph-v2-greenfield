/**
 * /admin/simulators/[id]/[scenarioKey]/calibration — loading state.
 */

import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      <SkeletonText lines={1} style={{ width: 200 }} />
      <SkeletonText lines={1} style={{ width: 400, marginTop: "var(--space-2)" }} />
      <div style={{ marginTop: "var(--space-6)" }}>
        <SkeletonBlock style={{ height: 200 }} />
      </div>
    </div>
  );
}
