import { SkeletonForm } from '@/components/ui/Skeleton';

export default function EditModuleLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 720 }}>
      <SkeletonForm fields={3} />
    </div>
  );
}
