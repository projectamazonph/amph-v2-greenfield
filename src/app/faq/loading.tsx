import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function FaqLoading() {
  return (
    <main
      aria-busy="true"
      style={{ padding: "var(--space-16) var(--side-pad)", maxWidth: 960, margin: "0 auto" }}
    >
      <SkeletonBlock width="180px" height="2.5rem" variant="text" />
      <div style={{ marginTop: "var(--space-3)", maxWidth: 640 }}>
        <SkeletonText lines={2} />
      </div>
      <div style={{ marginTop: "var(--space-10)" }}>
        <SkeletonText lines={12} />
      </div>
    </main>
  );
}
