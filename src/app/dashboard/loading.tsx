import { SkeletonCard, SkeletonBlock } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <main aria-busy="true" style={{ padding: "var(--space-10) var(--side-pad)", maxWidth: 960 }}>
      <SkeletonBlock width="220px" height="2rem" variant="text" />
      <div style={{ marginTop: "var(--space-2)" }}>
        <SkeletonBlock width="140px" height="0.75rem" variant="text" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "var(--space-6)",
          marginTop: "var(--space-8)",
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </main>
  );
}
