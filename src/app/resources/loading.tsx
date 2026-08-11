import { SkeletonBlock, SkeletonCard } from "@/components/ui/Skeleton";

export default function ResourcesLoading() {
  return (
    <main aria-busy="true" style={{ padding: "var(--space-10) var(--side-pad)", maxWidth: 960 }}>
      <SkeletonBlock width="240px" height="2rem" variant="text" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-6)",
          marginTop: "var(--space-8)",
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} lines={3} />
        ))}
      </div>
    </main>
  );
}
