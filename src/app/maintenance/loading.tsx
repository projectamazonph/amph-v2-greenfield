/**
 * /maintenance loading state.
 *
 * The proxy rewrites to /maintenance when the kill switch is engaged;
 * this covers a direct visit while Next.js streams the static 503 page.
 */

import { SkeletonCard } from "@/components/ui/Skeleton";

export default function MaintenanceLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "var(--space-6)",
        background: "var(--surface-1)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          background: "#ffffff",
        }}
      >
        <SkeletonCard lines={3} />
      </div>
    </main>
  );
}
