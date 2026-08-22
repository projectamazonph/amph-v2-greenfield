import { SkeletonForm } from "@/components/ui/Skeleton";

export default function CalibrationLoading() {
  // One row per known dimension, plus the standard submit row at the bottom.
  // Loading skeleton mirrors the visible shape so the page does not shift.
  return (
    <div style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 720 }}>
      <SkeletonForm fields={20} />
    </div>
  );
}
