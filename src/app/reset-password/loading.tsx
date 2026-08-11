import { SkeletonForm } from "@/components/ui/Skeleton";

export default function ResetPasswordLoading() {
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
        }}
      >
        <SkeletonForm fields={1} />
      </div>
    </main>
  );
}
