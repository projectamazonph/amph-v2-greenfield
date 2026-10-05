/**
 * /practice/simgrid/[...slug] loading state — SimGrid integration fix wave (C1).
 *
 * The catch-all wrapper page in src/app/practice/simgrid/[...slug]/page.tsx
 * awaits getSessionUserId() and resolves the simulator metadata before
 * mounting the SimgridFrame iframe. The architecture test in
 * tests/architecture/public-a11y-gates.test.ts requires every non-admin
 * page directory to expose a <main aria-busy> loading state — this
 * placeholder shows a tall rectangle that matches the iframe's
 * viewport (calc(100dvh - 220px), min-height min(600px, calc(100dvh
 * - 240px)) — see src/components/simgrid/SimgridFrame.module.css) so
 * the layout shift between the skeleton and the live iframe is small.
 */

import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PracticeSimgridSimulatorLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        padding: "var(--space-6) var(--side-pad) var(--space-12)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          height: "calc(100dvh - 220px)",
          minHeight: "min(600px, calc(100dvh - 240px))",
          background: "var(--surface-1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SkeletonBlock width="100%" height="100%" variant="rect" />
      </div>
      <div
        style={{
          marginTop: "var(--space-4)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <SkeletonBlock width="280px" height="0.875rem" variant="text" />
      </div>
    </main>
  );
}
