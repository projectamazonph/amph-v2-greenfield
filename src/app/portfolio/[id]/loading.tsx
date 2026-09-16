import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 24px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <SkeletonCard lines={2} />
      <SkeletonCard lines={6} />
    </main>
  );
}
