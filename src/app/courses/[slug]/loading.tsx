import { SkeletonBlock, SkeletonText, SkeletonCard } from "@/components/ui/Skeleton";

export default function CourseDetailLoading() {
  return (
    <main aria-busy="true">
      <div
        style={{
          padding: "var(--space-10) var(--side-pad)",
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 960 }}>
          <SkeletonBlock
            width="100%"
            height="200px"
            variant="rect"
            borderRadius="var(--radius-lg)"
          />
          <div style={{ marginTop: "var(--space-6)" }}>
            <SkeletonBlock width="60%" height="2rem" variant="text" />
            <div style={{ marginTop: "var(--space-2)" }}>
              <SkeletonText lines={2} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 720 }}>
        <SkeletonCard lines={3} />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonCard lines={3} />
        </div>
      </div>
    </main>
  );
}
