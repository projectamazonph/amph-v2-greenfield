import { SkeletonForm } from "@/components/ui/Skeleton";

export default function EditEmailTemplateLoading() {
  return (
    <div style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
      <SkeletonForm fields={4} />
    </div>
  );
}
