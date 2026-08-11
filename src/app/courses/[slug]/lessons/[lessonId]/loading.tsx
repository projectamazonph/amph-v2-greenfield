import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function LessonLoading() {
  return (
    <main aria-busy="true" style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 280,
          flexShrink: 0,
          padding: "var(--space-6)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SkeletonBlock width="100px" height="1rem" variant="text" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginTop: "var(--space-3)" }}>
            <SkeletonBlock width={i % 2 === 0 ? "80%" : "65%"} height="0.75rem" variant="text" />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "var(--space-8) var(--side-pad)", maxWidth: 720 }}>
        <SkeletonBlock width="40%" height="0.75rem" variant="text" />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonBlock width="80%" height="2rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-6)" }}>
          <SkeletonText lines={12} />
        </div>
      </div>
    </main>
  );
}
