import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function CheckoutLoading() {
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
      <div style={{ width: 420, maxWidth: "100%" }}>
        <SkeletonBlock width="60%" height="2rem" variant="text" />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonText lines={3} />
        </div>
        <div style={{ marginTop: "var(--space-6)" }}>
          <SkeletonBlock width="100%" height="48px" variant="rect" />
        </div>
      </div>
    </main>
  );
}
