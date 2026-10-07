import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function WelcomeLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        padding: "var(--space-10) var(--side-pad)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <SkeletonBlock width="280px" height="2rem" variant="text" />
      <div style={{ marginTop: "var(--space-2)" }}>
        <SkeletonBlock width="180px" height="0.875rem" variant="text" />
      </div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginTop: "var(--space-8)",
          justifyContent: "center",
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} width="32px" height="8px" variant="circle" />
        ))}
      </div>
      <div style={{ marginTop: "var(--space-10)" }}>
        <SkeletonBlock width="100%" height="1.5rem" variant="text" />
        <div style={{ marginTop: "var(--space-3)" }}>
          <SkeletonBlock width="85%" height="1.5rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <SkeletonBlock width="92%" height="1.5rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <SkeletonBlock width="78%" height="1.5rem" variant="text" />
        </div>
      </div>
      <div
        style={{
          marginTop: "var(--space-10)",
          display: "flex",
          gap: "var(--space-3)",
          justifyContent: "space-between",
        }}
      >
        <SkeletonBlock width="80px" height="44px" variant="rect" />
        <SkeletonBlock width="200px" height="44px" variant="rect" />
      </div>
    </main>
  );
}
