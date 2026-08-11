import { SkeletonForm } from "@/components/ui/Skeleton";

export default function SecurityLoading() {
  return (
    <main aria-busy="true" style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
      <SkeletonForm fields={2} />
    </main>
  );
}
