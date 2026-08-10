import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function CertificatesLoading() {
  return (
    <main style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 960 }}>
      <SkeletonBlock width="240px" height="2rem" variant="text" />
      <div style={{ marginTop: "var(--space-8)" }}>
        <SkeletonText lines={6} />
      </div>
    </main>
  );
}
