/**
 * /practice loading state — Task 14 (simulator UI refactor).
 *
 * The /practice hub page in src/app/practice/page.tsx is a server
 * component that the architecture test in
 * tests/architecture/public-a11y-gates.test.ts requires to expose a
 * <main aria-busy> loading state. This placeholder shows a header
 * skeleton + a 3x4 grid skeleton that matches the actual page layout
 * (12 cards in a 4-col grid at >=1280px viewport) so the layout shift
 * between the skeleton and the live content is small.
 */

import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PracticeHubLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        padding: "var(--space-8) var(--side-pad) var(--space-12)",
        maxWidth: "var(--max-content)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-2)",
        }}
      >
        <SkeletonBlock width="80px" height="0.6875rem" variant="text" />
        <SkeletonBlock width="240px" height="1.5rem" variant="text" />
        <SkeletonBlock width="60ch" height="1rem" variant="text" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "var(--space-4)",
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 200,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
            }}
          />
        ))}
      </div>
    </main>
  );
}
