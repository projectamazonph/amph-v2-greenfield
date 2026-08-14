import { SkeletonBlock, SkeletonText, SkeletonCard } from "@/components/ui/Skeleton";

export default function LessonDetailLoading() {
  return (
    <main aria-busy="true">
      <div style={{ padding: "var(--space-10) var(--side-pad)", maxWidth: 720 }}>
        <SkeletonBlock width="40%" height="1.25rem" variant="text" />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonBlock width="80%" height="2rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-6)" }}>
          <SkeletonCard lines={5} />
        </div>
      </div>
    </main>
  );
}
