import { SkeletonBlock, SkeletonTable } from "@/components/ui/Skeleton";

export default function LoadingGlobalDependenciesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SkeletonBlock height="2rem" width="200px" />
      <SkeletonTable columns={9} rows={9} />
    </div>
  );
}
