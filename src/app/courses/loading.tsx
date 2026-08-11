import { SkeletonCard } from "@/components/ui/Skeleton";

export default function CoursesLoading() {
  return (
    <main aria-busy="true" style={{ padding: "var(--space-10) var(--side-pad)", maxWidth: 960 }}>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div
          style={{
            width: "180px",
            height: "2rem",
            background: "var(--surface-1)",
            borderRadius: "var(--radius-sm)",
          }}
        />
        <div
          style={{
            marginTop: "var(--space-2)",
            width: "120px",
            height: "0.75rem",
            background: "var(--surface-1)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </main>
  );
}
