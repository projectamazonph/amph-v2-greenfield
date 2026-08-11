import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function CheckoutFailedLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "var(--space-10) var(--side-pad)",
      }}
    >
      <div style={{ width: 420, maxWidth: "100%", textAlign: "center" }}>
        <SkeletonBlock width="48px" height="48px" variant="circle" />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonBlock width="60%" height="2rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <SkeletonBlock width="80%" height="0.875rem" variant="text" />
        </div>
      </div>
    </main>
  );
}
