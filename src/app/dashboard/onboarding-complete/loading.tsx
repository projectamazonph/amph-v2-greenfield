import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 16px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </main>
  );
}
