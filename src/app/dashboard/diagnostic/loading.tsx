import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 16px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <SkeletonCard lines={2} />
      <SkeletonCard lines={6} />
      <SkeletonCard lines={2} />
    </main>
  );
}
