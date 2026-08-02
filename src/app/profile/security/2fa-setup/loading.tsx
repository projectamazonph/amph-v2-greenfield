import { SkeletonForm } from "@/components/ui/Skeleton";

export default function TwoFactorSetupLoading() {
  return (
    <div style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
      <SkeletonForm fields={3} />
    </div>
  );
}
