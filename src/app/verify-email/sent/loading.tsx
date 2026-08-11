import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function VerifyEmailSentLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "var(--space-6)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          background: "var(--surface-1)",
          textAlign: "center",
        }}
      >
        <SkeletonBlock width="48px" height="48px" variant="circle" />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonBlock width="70%" height="1.25rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <SkeletonBlock width="100%" height="0.875rem" variant="text" />
        </div>
        <div style={{ marginTop: "var(--space-1)" }}>
          <SkeletonBlock width="85%" height="0.875rem" variant="text" />
        </div>
      </div>
    </main>
  );
}
