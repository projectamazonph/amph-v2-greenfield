/**
 * /practice/simgrid loading state — SimGrid integration fix wave (C1).
 *
 * The 12-card SimGrid practice hub layout rendered by
 * src/app/practice/simgrid/page.tsx renders three async pieces
 * (StudentShell, FormativeScoreNotice, SimgridPracticeGrid). The
 * architecture test in tests/architecture/public-a11y-gates.test.ts
 * requires every non-admin page directory to expose a <main aria-busy>
 * loading state — mirrors the pattern in src/app/tools/loading.tsx,
 * bumped to 12 SkeletonCards so the placeholder shape matches the
 * 12 SimGrid simulators declared in src/lib/simgrid/manifest.ts.
 */

import { SkeletonBlock, SkeletonCard } from "@/components/ui/Skeleton";

export default function PracticeSimgridLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        padding: "var(--space-10) var(--side-pad) var(--space-12)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <SkeletonBlock width="160px" height="2rem" variant="text" />
      <div style={{ marginTop: "var(--space-3)" }}>
        <SkeletonBlock width="320px" height="0.875rem" variant="text" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-6)",
          marginTop: "var(--space-8)",
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </main>
  );
}
