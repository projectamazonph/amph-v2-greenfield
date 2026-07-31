import { SkeletonForm } from "@/components/ui/Skeleton";

export default function VerifyEmailLoading() {
  return (
    <div
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
          background: "var(--surface-card)",
        }}
      >
        <SkeletonForm fields={1} />
      </div>
    </div>
  );
}
