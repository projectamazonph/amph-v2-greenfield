import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function QuizLoading() {
  return (
    <div style={{ padding: "var(--space-10) var(--side-pad)", maxWidth: 720 }}>
      <SkeletonBlock width="200px" height="2rem" variant="text" />
      <div style={{ marginTop: "var(--space-6)" }}>
        <SkeletonText lines={4} />
      </div>
      <div style={{ marginTop: "var(--space-6)" }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            style={{
              padding: "var(--space-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-3)",
            }}
          >
            <SkeletonBlock width="80%" height="0.875rem" variant="text" />
          </div>
        ))}
      </div>
    </div>
  );
}
